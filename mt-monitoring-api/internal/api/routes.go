package api

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/mt-monitoring/api/internal/api/handlers"
	"github.com/mt-monitoring/api/internal/api/middleware"
	"github.com/mt-monitoring/api/internal/checker"
	"github.com/mt-monitoring/api/internal/collector"
)

// SetupRoutes configures all API routes
func SetupRoutes(app *fiber.App, scheduler *checker.Scheduler, collectorMgr *collector.CollectorManager) {
	// Apply global middleware
	app.Use(middleware.Recovery())
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())

	// API routes
	api := app.Group("/api/v1")

	// Health endpoints
	healthHandler := handlers.NewHealthHandler()
	api.Get("/health", healthHandler.Health)
	api.Get("/version", healthHandler.Version)

	// Service endpoints
	serviceHandler := handlers.NewServiceHandler(scheduler)
	api.Get("/services", serviceHandler.GetAll)
	api.Get("/services/:id", serviceHandler.GetByID)
	api.Post("/services", serviceHandler.Create)
	api.Put("/services/:id", serviceHandler.Update)
	api.Delete("/services/:id", serviceHandler.Delete)
	api.Post("/services/:id/pause", serviceHandler.Pause)
	api.Post("/services/:id/resume", serviceHandler.Resume)

	// Metric endpoints
	metricHandler := handlers.NewMetricHandler()
	api.Get("/services/:id/metrics", metricHandler.GetByServiceID)
	api.Get("/services/:id/metrics/summary", metricHandler.GetSummary)
	api.Get("/services/:id/uptime", metricHandler.GetUptime)

	// Log endpoints
	logHandler := handlers.NewLogHandler()
	api.Get("/logs", logHandler.GetAll)
	api.Get("/services/:id/logs", logHandler.GetByServiceID)

	// Dashboard endpoints
	dashboardHandler := handlers.NewDashboardHandler()
	api.Get("/dashboard/summary", dashboardHandler.GetSummary)
	api.Get("/dashboard/timeline", dashboardHandler.GetTimeline)

	// Incidents
	incidentHandler := handlers.NewIncidentHandler()
	api.Get("/incidents", incidentHandler.GetAll)
	api.Get("/incidents/active", incidentHandler.GetActive)

	// Host endpoints
	hostHandler := handlers.NewHostHandler(collectorMgr)
	api.Get("/hosts", hostHandler.GetAll)
	api.Get("/hosts/:hostId", hostHandler.GetByID)
	api.Post("/hosts", hostHandler.Create)
	api.Put("/hosts/:hostId", hostHandler.Update)
	api.Delete("/hosts/:hostId", hostHandler.Delete)
	api.Post("/hosts/:hostId/pause", hostHandler.Pause)
	api.Post("/hosts/:hostId/resume", hostHandler.Resume)

	// SSH connection test
	sshTestHandler := handlers.NewSSHTestHandler()
	api.Post("/hosts/test-connection", sshTestHandler.TestConnection)

	// Host-scoped system resource monitoring
	systemHandler := handlers.NewSystemHandler(collectorMgr)
	api.Get("/hosts/:hostId/system/info", systemHandler.GetInfo)
	api.Get("/hosts/:hostId/system/metrics", systemHandler.GetMetricsHistory)
	api.Get("/hosts/:hostId/system/processes", systemHandler.GetProcesses)

	// Legacy system endpoints (backward compatibility — defaults to local host)
	api.Get("/system/info", systemHandler.GetInfo)
	api.Get("/system/metrics/history", systemHandler.GetMetricsHistory)
	api.Get("/system/processes", systemHandler.GetProcesses)

	// Notifications
	notificationHandler := handlers.NewNotificationHandler()
	api.Get("/notifications", notificationHandler.GetAll)
	api.Post("/notifications", notificationHandler.Create)
	api.Put("/notifications/:id", notificationHandler.Update)
	api.Post("/notifications/:id/test", notificationHandler.Test)
	api.Post("/notifications/:id/toggle", notificationHandler.Toggle)
	api.Delete("/notifications/:id", notificationHandler.Delete)

	// Alert Rules
	alertRuleHandler := handlers.NewAlertRuleHandler()
	api.Get("/alert-rules", alertRuleHandler.GetAll)
	api.Get("/alert-rules/:id", alertRuleHandler.GetByID)
	api.Post("/alert-rules", alertRuleHandler.Create)
	api.Put("/alert-rules/:id", alertRuleHandler.Update)
	api.Delete("/alert-rules/:id", alertRuleHandler.Delete)
	api.Post("/alert-rules/:id/toggle", alertRuleHandler.Toggle)

	// Settings
	settingsHandler := handlers.NewSettingsHandler()
	api.Get("/settings", settingsHandler.Get)
	api.Put("/settings", settingsHandler.Update)

	// Notification History
	notificationHistoryHandler := handlers.NewNotificationHistoryHandler()
	api.Get("/notification-history", notificationHistoryHandler.GetAll)
	api.Get("/notification-history/stats", notificationHistoryHandler.GetStats)
	api.Get("/notification-history/:id", notificationHistoryHandler.GetByID)
	api.Delete("/notification-history/cleanup", notificationHistoryHandler.Cleanup)

	// Service API Key management
	api.Post("/services/:id/regenerate-key", serviceHandler.RegenerateKey)

	// Log Ingestion (API Key auth)
	logIngestHandler := handlers.NewLogIngestHandler()
	ingest := api.Group("/logs", middleware.ApiKeyAuth())
	ingest.Post("/ingest", logIngestHandler.Ingest)

	// Serve static files for frontend (if exists)
	app.Use("/", filesystem.New(filesystem.Config{
		Root:         http.Dir("./web"),
		Browse:       false,
		Index:        "index.html",
		NotFoundFile: "index.html", // SPA fallback
	}))
}
