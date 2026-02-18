package alerter

import (
	"encoding/json"
	"log"
	"time"

	"github.com/mt-monitoring/api/internal/config"
	"github.com/mt-monitoring/api/internal/database"
	"github.com/mt-monitoring/api/internal/models"
)

// Manager manages alert dispatching to multiple providers
type Manager struct {
	repo        *database.NotificationRepository
	historyRepo *database.NotificationHistoryRepository
	dedup       *Deduplicator
}

// NewManager creates a new alert manager
func NewManager() *Manager {
	cooldown := 5 * time.Minute
	if cfg := config.Get(); cfg != nil && cfg.Alerts.LogAlertCooldown > 0 {
		cooldown = time.Duration(cfg.Alerts.LogAlertCooldown) * time.Minute
	}

	return &Manager{
		repo:        database.NewNotificationRepository(),
		historyRepo: database.NewNotificationHistoryRepository(),
		dedup:       NewDeduplicator(cooldown),
	}
}

// Dispatch sends a notification to all enabled channels
func (m *Manager) Dispatch(notification Notification) {
	if notification.AlertType == "" {
		notification.AlertType = AlertTypeHealthCheck
	}

	channels, err := m.repo.GetEnabled()
	if err != nil {
		log.Printf("Failed to get enabled channels: %v", err)
		return
	}

	for _, ch := range channels {
		go m.sendToChannel(ch, notification)
	}
}

// DispatchLogAlert sends a log-based alert with deduplication
func (m *Manager) DispatchLogAlert(serviceID, serviceName, level, message string, metadata map[string]interface{}) {
	fingerprint := GenerateFingerprint(serviceID, level, message)

	if !m.dedup.ShouldAlert(fingerprint) {
		log.Printf("Dedup: suppressed duplicate log alert for service %s [%s]", serviceName, level)
		return
	}

	notification := Notification{
		ServiceID:   serviceID,
		ServiceName: serviceName,
		Message:     message,
		Time:        time.Now(),
		AlertType:   AlertTypeLog,
		LogLevel:    level,
		Metadata:    metadata,
	}

	m.Dispatch(notification)
}

// DispatchToChannels sends a notification to specific channels by ID.
// If channelIDs is empty, falls back to broadcasting to all enabled channels.
func (m *Manager) DispatchToChannels(notification Notification, channelIDs []string) {
	if len(channelIDs) == 0 {
		m.Dispatch(notification)
		return
	}

	for _, chID := range channelIDs {
		ch, err := m.repo.GetByID(chID)
		if err != nil || ch == nil || !ch.IsEnabled {
			continue
		}
		go m.sendToChannel(*ch, notification)
	}
}

// sendToChannel sends notification to a specific channel
func (m *Manager) sendToChannel(ch models.NotificationChannel, notification Notification) {
	var provider AlertProvider

	switch ch.Type {
	case "discord":
		var config models.DiscordConfig
		if err := json.Unmarshal([]byte(ch.Config), &config); err != nil {
			log.Printf("Failed to parse Discord config for channel %s: %v", ch.Name, err)
			return
		}
		provider = NewDiscordProvider(config.WebhookURL)

	case "telegram":
		var config models.TelegramConfig
		if err := json.Unmarshal([]byte(ch.Config), &config); err != nil {
			log.Printf("Failed to parse Telegram config for channel %s: %v", ch.Name, err)
			return
		}
		provider = NewTelegramProvider(config.BotToken, config.ChatID)

	default:
		log.Printf("Unknown channel type: %s", ch.Type)
		return
	}

	// Create history record
	history := &models.NotificationHistory{
		ChannelID:   ch.ID,
		ChannelName: ch.Name,
		ChannelType: ch.Type,
		AlertType:   notification.AlertType,
		Severity:    notification.Severity,
		Message:     notification.Message,
		Status:      "pending",
		RetryCount:  0,
		CreatedAt:   time.Now(),
	}

	// Add optional fields
	if notification.HostID != "" {
		history.HostID = &notification.HostID
	}
	if notification.HostName != "" {
		history.HostName = &notification.HostName
	}
	if notification.ServiceID != "" {
		history.ServiceID = &notification.ServiceID
	}
	if notification.ServiceName != "" {
		history.ServiceName = &notification.ServiceName
	}

	// Save history
	if err := m.historyRepo.Create(history); err != nil {
		log.Printf("Failed to create notification history: %v", err)
	}

	// Send notification with retry logic
	maxRetries := 3
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 2s, 4s, 8s
			backoffDuration := time.Duration(1<<uint(attempt)) * 2 * time.Second
			log.Printf("Retrying alert to %s (%s) in %v (attempt %d/%d)",
				ch.Name, ch.Type, backoffDuration, attempt+1, maxRetries)
			time.Sleep(backoffDuration)

			// Update retry count
			if history.ID > 0 {
				m.historyRepo.IncrementRetry(history.ID)
			}
		}

		// Attempt to send
		if err := provider.Send(notification); err != nil {
			lastErr = err
			log.Printf("Failed to send alert to %s (%s) (attempt %d/%d): %v",
				ch.Name, ch.Type, attempt+1, maxRetries, err)
			continue // Retry
		}

		// Success!
		log.Printf("Alert sent to %s (%s) for service %s", ch.Name, ch.Type, notification.ServiceName)
		if history.ID > 0 {
			m.historyRepo.UpdateStatus(history.ID, "sent", "")
		}
		return
	}

	// All retries failed
	log.Printf("All retries exhausted for alert to %s (%s): %v", ch.Name, ch.Type, lastErr)
	if history.ID > 0 {
		errMsg := lastErr.Error()
		m.historyRepo.UpdateStatus(history.ID, "failed", errMsg)
	}
}
