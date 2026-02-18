package database

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/mt-monitoring/api/internal/models"
)

// ServiceRepository handles service data operations
type ServiceRepository struct{}

// NewServiceRepository creates a new service repository
func NewServiceRepository() *ServiceRepository {
	return &ServiceRepository{}
}

// GetAll returns all services
func (r *ServiceRepository) GetAll() ([]models.Service, error) {
	rows, err := DB.Query(`
		SELECT id, name, type, is_active, url, port, method, headers, body,
		       expected_status, interval, timeout, tags, schedule_type, cron_expression,
		       created_at, updated_at
		FROM services
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		var isActive int
		var url, method, headers, body, tags, scheduleType, cronExpression sql.NullString
		var port, expectedStatus, interval, timeout sql.NullInt64
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &isActive, &url, &port, &method, &headers, &body,
			&expectedStatus, &interval, &timeout, &tags, &scheduleType, &cronExpression,
			&s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.IsActive = isActive == 1
		if url.Valid {
			s.URL = url.String
		}
		if port.Valid {
			s.Port = int(port.Int64)
		}
		if method.Valid {
			s.Method = method.String
		}
		if headers.Valid && headers.String != "" {
			json.Unmarshal([]byte(headers.String), &s.Headers)
		}
		if body.Valid {
			s.Body = body.String
		}
		if expectedStatus.Valid {
			s.ExpectedStatus = int(expectedStatus.Int64)
		}
		if interval.Valid {
			s.Interval = int(interval.Int64)
		}
		if timeout.Valid {
			s.Timeout = int(timeout.Int64)
		}
		if tags.Valid && tags.String != "" {
			json.Unmarshal([]byte(tags.String), &s.Tags)
		}
		if scheduleType.Valid {
			s.ScheduleType = models.ScheduleType(scheduleType.String)
		} else {
			s.ScheduleType = models.ScheduleTypeInterval
		}
		if cronExpression.Valid {
			s.CronExpression = cronExpression.String
		}
		s.Status = models.StatusUnknown
		services = append(services, s)
	}
	return services, nil
}

// GetByID returns a service by ID
func (r *ServiceRepository) GetByID(id string) (*models.Service, error) {
	var s models.Service
	var isActive int
	var url, method, headers, body, tags, scheduleType, cronExpression sql.NullString
	var port, expectedStatus, interval, timeout sql.NullInt64

	err := DB.QueryRow(`
		SELECT id, name, type, is_active, url, port, method, headers, body,
		       expected_status, interval, timeout, tags, schedule_type, cron_expression,
		       created_at, updated_at
		FROM services WHERE id = ?
	`, id).Scan(&s.ID, &s.Name, &s.Type, &isActive, &url, &port, &method, &headers, &body,
		&expectedStatus, &interval, &timeout, &tags, &scheduleType, &cronExpression,
		&s.CreatedAt, &s.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	s.IsActive = isActive == 1
	if url.Valid {
		s.URL = url.String
	}
	if port.Valid {
		s.Port = int(port.Int64)
	}
	if method.Valid {
		s.Method = method.String
	}
	if headers.Valid && headers.String != "" {
		json.Unmarshal([]byte(headers.String), &s.Headers)
	}
	if body.Valid {
		s.Body = body.String
	}
	if expectedStatus.Valid {
		s.ExpectedStatus = int(expectedStatus.Int64)
	}
	if interval.Valid {
		s.Interval = int(interval.Int64)
	}
	if timeout.Valid {
		s.Timeout = int(timeout.Int64)
	}
	if tags.Valid && tags.String != "" {
		json.Unmarshal([]byte(tags.String), &s.Tags)
	}
	if scheduleType.Valid {
		s.ScheduleType = models.ScheduleType(scheduleType.String)
	} else {
		s.ScheduleType = models.ScheduleTypeInterval
	}
	if cronExpression.Valid {
		s.CronExpression = cronExpression.String
	}
	s.Status = models.StatusUnknown

	return &s, nil
}

// Create creates a new service
func (r *ServiceRepository) Create(s *models.Service) error {
	var headersJSON, tagsJSON []byte
	var err error

	if s.Headers != nil {
		headersJSON, err = json.Marshal(s.Headers)
		if err != nil {
			return err
		}
	}
	if s.Tags != nil {
		tagsJSON, err = json.Marshal(s.Tags)
		if err != nil {
			return err
		}
	}

	isActive := 0
	if s.IsActive {
		isActive = 1
	}

	// Default to "interval" if not set
	scheduleType := string(s.ScheduleType)
	if scheduleType == "" {
		scheduleType = string(models.ScheduleTypeInterval)
	}

	_, err = DB.Exec(`
		INSERT INTO services (id, name, type, is_active, url, port, method, headers, body,
		                      expected_status, interval, timeout, tags, schedule_type, cron_expression,
		                      api_key, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, s.ID, s.Name, s.Type, isActive, s.URL, s.Port, s.Method, string(headersJSON), s.Body,
		s.ExpectedStatus, s.Interval, s.Timeout, string(tagsJSON), scheduleType, s.CronExpression,
		s.ApiKey, s.CreatedAt, s.UpdatedAt)
	return err
}

// UpdateApiKey updates only the api_key field of a service
func (r *ServiceRepository) UpdateApiKey(id, apiKey string) error {
	_, err := DB.Exec(`UPDATE services SET api_key = ?, updated_at = ? WHERE id = ?`, apiKey, time.Now(), id)
	return err
}

// Update updates a service
func (r *ServiceRepository) Update(s *models.Service) error {
	var headersJSON, tagsJSON []byte
	var err error

	if s.Headers != nil {
		headersJSON, err = json.Marshal(s.Headers)
		if err != nil {
			return err
		}
	}
	if s.Tags != nil {
		tagsJSON, err = json.Marshal(s.Tags)
		if err != nil {
			return err
		}
	}

	isActive := 0
	if s.IsActive {
		isActive = 1
	}

	// Default to "interval" if not set
	scheduleType := string(s.ScheduleType)
	if scheduleType == "" {
		scheduleType = string(models.ScheduleTypeInterval)
	}

	s.UpdatedAt = time.Now()
	_, err = DB.Exec(`
		UPDATE services SET name = ?, type = ?, is_active = ?, url = ?, port = ?, method = ?,
		                    headers = ?, body = ?, expected_status = ?, interval = ?, timeout = ?,
		                    tags = ?, schedule_type = ?, cron_expression = ?, updated_at = ?
		WHERE id = ?
	`, s.Name, s.Type, isActive, s.URL, s.Port, s.Method, string(headersJSON), s.Body,
		s.ExpectedStatus, s.Interval, s.Timeout, string(tagsJSON), scheduleType, s.CronExpression,
		s.UpdatedAt, s.ID)
	return err
}

// GetActive returns all active services (is_active = 1)
func (r *ServiceRepository) GetActive() ([]models.Service, error) {
	rows, err := DB.Query(`
		SELECT id, name, type, is_active, url, port, method, headers, body,
		       expected_status, interval, timeout, tags, schedule_type, cron_expression,
		       created_at, updated_at
		FROM services
		WHERE is_active = 1
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		var isActive int
		var url, method, headers, body, tags, scheduleType, cronExpression sql.NullString
		var port, expectedStatus, interval, timeout sql.NullInt64
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &isActive, &url, &port, &method, &headers, &body,
			&expectedStatus, &interval, &timeout, &tags, &scheduleType, &cronExpression,
			&s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.IsActive = isActive == 1
		if url.Valid {
			s.URL = url.String
		}
		if port.Valid {
			s.Port = int(port.Int64)
		}
		if method.Valid {
			s.Method = method.String
		}
		if headers.Valid && headers.String != "" {
			json.Unmarshal([]byte(headers.String), &s.Headers)
		}
		if body.Valid {
			s.Body = body.String
		}
		if expectedStatus.Valid {
			s.ExpectedStatus = int(expectedStatus.Int64)
		}
		if interval.Valid {
			s.Interval = int(interval.Int64)
		}
		if timeout.Valid {
			s.Timeout = int(timeout.Int64)
		}
		if tags.Valid && tags.String != "" {
			json.Unmarshal([]byte(tags.String), &s.Tags)
		}
		if scheduleType.Valid {
			s.ScheduleType = models.ScheduleType(scheduleType.String)
		} else {
			s.ScheduleType = models.ScheduleTypeInterval
		}
		if cronExpression.Valid {
			s.CronExpression = cronExpression.String
		}
		s.Status = models.StatusUnknown
		services = append(services, s)
	}
	return services, nil
}

// SetActive sets the is_active flag for a service
func (r *ServiceRepository) SetActive(id string, isActive bool) error {
	active := 0
	if isActive {
		active = 1
	}
	_, err := DB.Exec(`UPDATE services SET is_active = ?, updated_at = ? WHERE id = ?`,
		active, time.Now(), id)
	return err
}

// GetByApiKey returns a service by its API key
func (r *ServiceRepository) GetByApiKey(apiKey string) (*models.Service, error) {
	if apiKey == "" {
		return nil, nil
	}
	var s models.Service
	var isActive int
	var headersJSON, tagsJSON, apiKeyVal sql.NullString

	err := DB.QueryRow(`
		SELECT id, name, type, is_active, url, port, method, headers, body,
		       expected_status, interval, timeout, tags, created_at, updated_at, api_key
		FROM services WHERE api_key = ?
	`, apiKey).Scan(&s.ID, &s.Name, &s.Type, &isActive, &s.URL, &s.Port, &s.Method,
		&headersJSON, &s.Body, &s.ExpectedStatus, &s.Interval, &s.Timeout,
		&tagsJSON, &s.CreatedAt, &s.UpdatedAt, &apiKeyVal)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	s.IsActive = isActive == 1
	if headersJSON.Valid && headersJSON.String != "" {
		json.Unmarshal([]byte(headersJSON.String), &s.Headers)
	}
	if tagsJSON.Valid && tagsJSON.String != "" {
		json.Unmarshal([]byte(tagsJSON.String), &s.Tags)
	}
	if apiKeyVal.Valid {
		s.ApiKey = apiKeyVal.String
	}

	return &s, nil
}

// Delete deletes a service
func (r *ServiceRepository) Delete(id string) error {
	_, err := DB.Exec("DELETE FROM services WHERE id = ?", id)
	return err
}
