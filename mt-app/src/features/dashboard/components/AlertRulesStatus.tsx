import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { MaterialIcon } from '../../../components/common';
import { api, type AlertRule } from '../../../services/api';

const SEVERITY_COLOR: Record<string, { text: string; bg: string; dot: string }> = {
  critical: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-500' },
  warning: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  info: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
};

const METRIC_SHORT: Record<string, string> = {
  cpu: 'CPU',
  memory: 'Mem',
  disk: 'Disk',
  http_status: 'HTTP',
  response_time: 'RT',
  status_change: 'Status',
};

export function AlertRulesStatus() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlertRules()
      .then(setRules)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const enabledCount = rules.filter(r => r.isEnabled).length;
  // +1 for built-in reboot rule (always on)
  const totalCount = rules.length + 1;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MaterialIcon name="rule" className="text-xl text-primary" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t('dashboard.alertRules.title')}
          </h2>
          {!loading && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {enabledCount + 1}/{totalCount}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/alerts?tab=rules')}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {t('dashboard.alertRules.manage')}
          <MaterialIcon name="arrow_forward" className="text-sm" />
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {/* Built-in: Server Reboot — always at top */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <MaterialIcon name="restart_alt" className="text-base text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {t('dashboard.alertRules.serverReboot')}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 shrink-0">
                  {t('dashboard.alertRules.builtIn')}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">info · status_change</p>
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime-500/10 text-lime-600 dark:text-lime-400 text-[11px] font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
              {t('alerts.rules.alwaysOn')}
            </span>
          </div>

          {/* User-configured rules */}
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('dashboard.alertRules.empty')}
              </p>
              <button
                onClick={() => navigate('/alerts?tab=rules')}
                className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {t('dashboard.alertRules.addRule')} →
              </button>
            </div>
          ) : (
            rules.map((rule) => {
              const sev = SEVERITY_COLOR[rule.severity] ?? SEVERITY_COLOR.info;
              const metricLabel = METRIC_SHORT[rule.metric] ?? rule.metric;
              return (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 transition-colors ${!rule.isEnabled ? 'opacity-50' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg ${sev.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-bold ${sev.text}`}>{metricLabel}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {rule.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                      {rule.severity} · {rule.metric}
                    </p>
                  </div>
                  {rule.isEnabled ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime-500/10 text-lime-600 dark:text-lime-400 text-[11px] font-bold shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
                      {t('dashboard.alertRules.active')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      {t('dashboard.alertRules.inactive')}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
