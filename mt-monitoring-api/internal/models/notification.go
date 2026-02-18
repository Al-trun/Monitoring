package models

import "time"

// NotificationChannel represents a configured alert channel
type NotificationChannel struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`   // "telegram" | "discord"
	Config    string    `json:"config"` // JSON string
	IsEnabled bool      `json:"isEnabled"`
	CreatedAt time.Time `json:"createdAt"`
}

// TelegramConfig holds Telegram bot configuration
type TelegramConfig struct {
	BotToken string `json:"botToken"`
	ChatID   string `json:"chatId"`
}

// DiscordConfig holds Discord webhook configuration
type DiscordConfig struct {
	WebhookURL string `json:"webhookUrl"`
}

// NotificationChannelCreateRequest represents the request to create a channel
type NotificationChannelCreateRequest struct {
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config"`
}
