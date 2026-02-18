package alerter

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/mt-monitoring/api/internal/database"
	"github.com/mt-monitoring/api/internal/models"
)

// ServiceRuleEvaluator evaluates alert rules against incoming endpoint check results.
// It mirrors RuleEvaluator but operates on service metrics (HTTP status codes and response times).
type ServiceRuleEvaluator struct {
	manager   *Manager
	repo      *database.AlertRuleRepository
	stateRepo *database.AlertRuleStateRepository

	mu           sync.Mutex
	breachCounts map[string]int       // ruleKey → consecutive breach count
	lastAlerted  map[string]time.Time // ruleKey → last alert time (for cooldown)
	wasAlerting  map[string]bool      // ruleKey → whether an alert was fired (for recovery)
}

// NewServiceRuleEvaluator creates a new service rule evaluator.
func NewServiceRuleEvaluator(manager *Manager) *ServiceRuleEvaluator {
	evaluator := &ServiceRuleEvaluator{
		manager:      manager,
		repo:         database.NewAlertRuleRepository(),
		stateRepo:    database.NewAlertRuleStateRepository(),
		breachCounts: make(map[string]int),
		lastAlerted:  make(map[string]time.Time),
		wasAlerting:  make(map[string]bool),
	}

	evaluator.loadState()

	return evaluator
}

// Evaluate checks all enabled service rules for a service against the given check result.
// This is called by Scheduler after each service check.
func (e *ServiceRuleEvaluator) Evaluate(serviceID, serviceName string, statusCode, responseTimeMs int) {
	rules, err := e.repo.GetEnabledByServiceID(serviceID)
	if err != nil {
		log.Printf("[ServiceEvaluator] Failed to get rules for service %s: %v", serviceID, err)
		return
	}

	for _, rule := range rules {
		e.evaluateRule(rule, serviceID, serviceName, statusCode, responseTimeMs)
	}
}

// evaluateRule evaluates a single rule against the service check result.
func (e *ServiceRuleEvaluator) evaluateRule(
	rule models.AlertRule,
	serviceID, serviceName string,
	statusCode, responseTimeMs int,
) {
	value := extractServiceMetricValue(rule.Metric, statusCode, responseTimeMs)
	breached := compareValue(value, rule.Operator, rule.Threshold)
	ruleKey := e.ruleKey(rule.ID, serviceID)

	e.mu.Lock()
	defer e.mu.Unlock()

	if breached {
		e.breachCounts[ruleKey]++

		// For service rules, Duration = number of consecutive failing checks (not minutes)
		requiredCount := rule.Duration
		if requiredCount < 1 {
			requiredCount = 1
		}

		if e.breachCounts[ruleKey] >= requiredCount {
			// Check cooldown
			if last, ok := e.lastAlerted[ruleKey]; ok {
				if time.Since(last) < time.Duration(rule.Cooldown)*time.Second {
					return // Still in cooldown
				}
			}

			// Fire alert
			e.lastAlerted[ruleKey] = time.Now()
			e.wasAlerting[ruleKey] = true

			notification := Notification{
				AlertType:   AlertTypeEndpoint,
				ServiceID:   serviceID,
				ServiceName: serviceName,
				Metric:      string(rule.Metric),
				Value:       value,
				Threshold:   rule.Threshold,
				Severity:    string(rule.Severity),
				StatusCode:  statusCode,
				Message:     buildEndpointAlertMessage(rule, serviceName, value),
				Time:        time.Now(),
			}

			log.Printf("[ServiceEvaluator] ALERT %s: %s=%.0f > %.0f (service: %s, rule: %s)",
				rule.Severity, rule.Metric, value, rule.Threshold, serviceName, rule.Name)

			go e.manager.DispatchToChannels(notification, rule.ChannelIDs)
			go e.saveState(rule.ID, serviceID)
		} else {
			go e.saveState(rule.ID, serviceID)
		}
	} else {
		// Metric is back to normal
		if e.wasAlerting[ruleKey] {
			e.wasAlerting[ruleKey] = false

			notification := Notification{
				AlertType:   AlertTypeEndpoint,
				ServiceID:   serviceID,
				ServiceName: serviceName,
				Metric:      string(rule.Metric),
				Value:       value,
				Threshold:   rule.Threshold,
				Severity:    "info",
				StatusCode:  statusCode,
				Message:     buildEndpointRecoveryMessage(rule, serviceName, value),
				Time:        time.Now(),
			}

			log.Printf("[ServiceEvaluator] RECOVERED: %s=%.0f recovered (service: %s, rule: %s)",
				rule.Metric, value, serviceName, rule.Name)

			go e.manager.DispatchToChannels(notification, rule.ChannelIDs)
		}
		e.breachCounts[ruleKey] = 0
		go e.saveState(rule.ID, serviceID)
	}
}

// ResetRule clears cached state for a rule (call on rule update/delete).
func (e *ServiceRuleEvaluator) ResetRule(ruleID string) {
	e.mu.Lock()
	defer e.mu.Unlock()

	for key := range e.breachCounts {
		if strings.HasPrefix(key, ruleID+":") || key == ruleID {
			delete(e.breachCounts, key)
			delete(e.lastAlerted, key)
			delete(e.wasAlerting, key)
		}
	}

	e.stateRepo.DeleteByRule(ruleID)
}

// loadState is a no-op for service rules.
// Service checks run frequently enough that breach counters reset safely on restart.
func (e *ServiceRuleEvaluator) loadState() {
	// In-memory only — no cross-restart persistence for service rule states
}

// saveState persists current state to database.
// ServiceID is stored in the HostID field for reuse of existing schema.
func (e *ServiceRuleEvaluator) saveState(ruleID, serviceID string) {
	key := e.ruleKey(ruleID, serviceID)

	state := &models.AlertRuleState{
		RuleID:      ruleID,
		HostID:      serviceID, // serviceID stored in host_id column
		BreachCount: e.breachCounts[key],
		IsAlerting:  e.wasAlerting[key],
	}

	if lastAlerted, ok := e.lastAlerted[key]; ok {
		state.LastAlertedAt = &lastAlerted
	}

	if err := e.stateRepo.SaveState(state); err != nil {
		log.Printf("[ServiceEvaluator] Failed to save state for %s: %v", key, err)
	}
}

// ruleKey generates a composite key.
func (e *ServiceRuleEvaluator) ruleKey(ruleID, serviceID string) string {
	return ruleID + ":" + serviceID
}

// extractServiceMetricValue extracts the relevant metric value from check result fields.
func extractServiceMetricValue(metric models.AlertMetric, statusCode, responseTimeMs int) float64 {
	switch metric {
	case models.AlertMetricHTTPStatus:
		return float64(statusCode)
	case models.AlertMetricResponseTime:
		return float64(responseTimeMs)
	default:
		return 0
	}
}

// buildEndpointAlertMessage creates a human-readable alert message.
func buildEndpointAlertMessage(rule models.AlertRule, serviceName string, value float64) string {
	switch rule.Metric {
	case models.AlertMetricHTTPStatus:
		return fmt.Sprintf("HTTP %d response on %s (threshold: %s %.0f)",
			int(value), serviceName, operatorLabel(rule.Operator), rule.Threshold)
	case models.AlertMetricResponseTime:
		return fmt.Sprintf("Response time %.0fms on %s exceeds threshold %s %.0fms",
			value, serviceName, operatorLabel(rule.Operator), rule.Threshold)
	default:
		return fmt.Sprintf("Endpoint alert on %s: %.0f %s %.0f",
			serviceName, value, operatorLabel(rule.Operator), rule.Threshold)
	}
}

// buildEndpointRecoveryMessage creates a human-readable recovery message.
func buildEndpointRecoveryMessage(rule models.AlertRule, serviceName string, value float64) string {
	switch rule.Metric {
	case models.AlertMetricHTTPStatus:
		return fmt.Sprintf("HTTP response recovered to %d on %s", int(value), serviceName)
	case models.AlertMetricResponseTime:
		return fmt.Sprintf("Response time recovered to %.0fms on %s", value, serviceName)
	default:
		return fmt.Sprintf("Endpoint metric recovered on %s: %.0f", serviceName, value)
	}
}

// operatorLabel returns a human-readable operator string.
func operatorLabel(op models.AlertOperator) string {
	switch op {
	case models.AlertOperatorGT:
		return ">"
	case models.AlertOperatorGTE:
		return ">="
	case models.AlertOperatorLT:
		return "<"
	case models.AlertOperatorLTE:
		return "<="
	case models.AlertOperatorEQ:
		return "="
	default:
		return ">"
	}
}
