package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/mt-monitoring/api/internal/database"
)

// ApiKeyAuth returns a middleware that validates API key from Authorization header
func ApiKeyAuth() fiber.Handler {
	repo := database.NewServiceRepository()

	return func(c *fiber.Ctx) error {
		auth := c.Get("Authorization")
		if auth == "" {
			return c.Status(401).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "UNAUTHORIZED",
					"message": "Missing Authorization header",
				},
			})
		}

		// Expect "Bearer <api_key>"
		parts := strings.SplitN(auth, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(401).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "UNAUTHORIZED",
					"message": "Invalid Authorization format. Expected: Bearer <api_key>",
				},
			})
		}

		apiKey := parts[1]
		service, err := repo.GetByApiKey(apiKey)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "INTERNAL_ERROR",
					"message": "Failed to validate API key",
				},
			})
		}

		if service == nil {
			return c.Status(401).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "UNAUTHORIZED",
					"message": "Invalid API key",
				},
			})
		}

		// Store service in context for downstream handlers
		c.Locals("service", service)
		return c.Next()
	}
}
