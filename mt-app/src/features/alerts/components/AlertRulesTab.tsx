import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../../../components/common';
import { api, type AlertRule, type NotificationChannel } from '../../../services/api';
import { AlertRuleModal } from './AlertRuleModal';

const SEVERITY_CONFIG = {
  critical: { icon: 'error', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  warning: { icon: 'warning', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  info: { icon: 'info', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
};

const METRIC_LABELS: Record<string, string> = {
  cpu: 'CPU',
  memory: 'Memory',
  disk: 'Disk',
  status_change: 'Status',
  http_status: 'HTTP Status',
  response_time: 'Response Time',
};

const ENDPOINT_METRICS = new Set(['http_status', 'response_time']);

const OPERATOR_LABELS: Record<string, string> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  eq: '=',
};

export function AlertRulesTab() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | undefined>();
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    try {
      const [rulesData, channelsData] = await Promise.all([
        api.getAlertRules(),
        api.getNotificationChannels(),
      ]);
      setRules(rulesData);
      setChannels(channelsData);
    } catch {
      toast.error(t('alerts.rules.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string) => {
    setTogglingIds(prev => new Set(prev).add(id));
    try {
      const result = await api.toggleAlertRule(id);
      setRules(prev =>
        prev.map(r => r.id === id ? { ...r, isEnabled: result.isEnabled } : r)
      );
      toast.success(result.isEnabled ? t('alerts.rules.ruleEnabled') : t('alerts.rules.ruleDisabled'));
    } catch {
      toast.error(t('alerts.rules.toggleFailed'));
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('alerts.rules.deleteConfirm'))) return;
    try {
      await api.deleteAlertRule(id);
      toast.success(t('alerts.rules.deleted'));
      loadData();
    } catch {
      toast.error(t('alerts.rules.deleteFailed'));
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRule(undefined);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('alerts.rules.rulesCount_other', { count: rules.length })}
        </p>
        <button
          onClick={() => { setEditingRule(undefined); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md text-sm"
        >
          <MaterialIcon name="add" className="text-lg" />
          {t('alerts.rules.addRule')}
        </button>
      </div>

      <div className="space-y-3">
        {/* Built-in: Server Reboot — always visible, not editable */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center shrink-0">
            <MaterialIcon name="restart_alt" className="text-xl text-blue-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-900 dark:text-white truncate">{t('alerts.rules.serverReboot')}</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                info
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 rounded-full">
                {t('alerts.rules.builtIn')}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('alerts.rules.serverRebootDesc')}
              {' · '}
              <span className="italic">{t('alerts.rules.allChannels')}</span>
            </p>
          </div>

          <div className="shrink-0">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime-500/10 text-lime-600 dark:text-lime-400 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
              {t('alerts.rules.alwaysOn')}
            </span>
          </div>
        </div>

        {/* User-configured rules */}
        {rules.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-3">{t('alerts.rules.noRules')}</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md text-sm"
            >
              {t('alerts.rules.addRule')}
            </button>
          </div>
        ) : (
          rules.map(rule => {
            const sev = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.info;
            const channelNames = rule.channelIds
              ?.map(cid => channels.find(ch => ch.id === cid)?.name)
              .filter(Boolean);

            return (
              <div
                key={rule.id}
                className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors ${!rule.isEnabled ? 'opacity-50' : ''}`}
              >
                {/* Severity icon */}
                <div className={`w-10 h-10 ${sev.bg} rounded-lg flex items-center justify-center shrink-0`}>
                  <MaterialIcon name={sev.icon} className={`text-xl ${sev.color}`} />
                </div>

                {/* Rule info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{rule.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${sev.badge}`}>
                      {rule.severity}
                    </span>
                    {rule.id.startsWith('preset-') && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-full">
                        {t('alerts.rules.preset')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {METRIC_LABELS[rule.metric] || rule.metric} {OPERATOR_LABELS[rule.operator] || rule.operator} {rule.threshold}{ENDPOINT_METRICS.has(rule.metric) ? (rule.metric === 'response_time' ? 'ms' : '') : '%'}
                    {' · '}
                    {ENDPOINT_METRICS.has(rule.metric) ? `${rule.duration} checks` : `${rule.duration}min`} · cooldown {rule.cooldown}s
                    {channelNames && channelNames.length > 0 && (
                      <> · <span className="text-primary">{channelNames.join(', ')}</span></>
                    )}
                    {(!rule.channelIds || rule.channelIds.length === 0) && (
                      <> · <span className="italic">{t('alerts.rules.allChannels')}</span></>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleToggle(rule.id)}
                    disabled={togglingIds.has(rule.id)}
                    className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{ backgroundColor: rule.isEnabled ? 'var(--color-primary, #6366f1)' : '#94a3b8' }}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${rule.isEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="Edit"
                  >
                    <MaterialIcon name="edit" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    title="Delete"
                  >
                    <MaterialIcon name="delete" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AlertRuleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={loadData}
        rule={editingRule}
        channels={channels}
      />
    </>
  );
}
