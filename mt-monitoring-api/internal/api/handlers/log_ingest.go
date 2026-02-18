package handlers

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/mt-monitoring/api/internal/alerter"
	"github.com/mt-monitoring/api/internal/database"
	"github.com/mt-monitoring/api/internal/models"
)

// LogIngestHandler handles external log ingestion via API key
type LogIngestHandler struct {
	logRepo      *database.LogRepository
	alertManager *alerter.Manager
}

// NewLogIngestHandler creates a new log ingest handler
func NewLogIngestHandler() *LogIngestHandler {
	return &LogIngestHandler{
		logRepo:      database.NewLogRepository(),
		alertManager: alerter.NewManager(),
	}
}

// Ingest receives logs from external services authenticated by API key
func (h *LogIngestHandler) Ingest(c *fiber.Ctx) error {
	// Service is set by ApiKeyAuth middleware
	service, ok := c.Locals("service").(*models.Service)
	if !ok || service == nil {
		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "UNAUTHORIZED",
				"message": "Service not found in context",
			},
		})
	}

	var req models.LogIngestRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "INVALID_REQUEST",
				"message": "Invalid request body: " + err.Error(),
			},
		})
	}

	// Validate required fields
	if req.Message == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": "message is required",
			},
		})
	}

	// Default level to error if not specified
	if req.Level == "" {
		req.Level = models.LogLevelError
	}

	// Validate level
	if req.Level != models.LogLevelError && req.Level != models.LogLevelWarn && req.Level != models.LogLevelInfo {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": "level must be one of: error, warn, info",
			},
		})
	}

	// Generate fingerprint for deduplication
	fingerprint := alerter.GenerateFingerprint(service.ID, string(req.Level), req.Message)

	// Marshal metadata
	var metadataJSON json.RawMessage
	if req.Metadata != nil {
		data, err := json.Marshal(req.Metadata)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "VALIDATION_ERROR",
					"message": "Invalid metadata format",
				},
			})
		}
		metadataJSON = data
	}

	// Create log entry
	logEntry := &models.Log{
		ServiceID:   service.ID,
		Level:       req.Level,
		Message:     req.Message,
		Metadata:    metadataJSON,
		Source:      models.LogSourceExternal,
		Fingerprint: fingerprint,
		CreatedAt:   time.Now(),
	}

	if err := h.logRepo.Create(logEntry); err != nil {
		log.Printf("Failed to create log entry: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": "Failed to store log entry",
			},
		})
	}

	// Trigger alert for error/warn levels
	if req.Level == models.LogLevelError || req.Level == models.LogLevelWarn {
		go h.alertManager.DispatchLogAlert(
			service.ID,
			service.Name,
			string(req.Level),
			req.Message,
			req.Metadata,
		)
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id":          logEntry.ID,
			"fingerprint": fingerprint,
		},
	})
}
