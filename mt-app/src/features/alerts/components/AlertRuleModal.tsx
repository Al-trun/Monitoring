import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../../../components/common';
import {
  api,
  type AlertRule,
  type NotificationChannel,
  type Service,
} from '../../../services/api';

const ruleSchema = z.object({
  name: z.string().min(1),
  ruleCategory: z.enum(['resource', 'endpoint']),
  metric: z.enum(['cpu', 'memory', 'disk', 'http_status', 'response_time']),
  serviceId: z.string().optional(),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  threshold: z.number().min(0),
  duration: z.number().min(1).max(60),
  severity: z.enum(['critical', 'warning', 'info']),
  cooldown: z.number().min(60).max(86400),
  channelIds: z.array(z.string()),
}).superRefine((data, ctx) => {
  if (data.ruleCategory === 'endpoint' && !data.serviceId) {
    ctx.addIssue({ path: ['serviceId'], code: z.ZodIssueCode.custom, message: 'required' });
  }
  if (!data.name.trim()) {
    ctx.addIssue({ path: ['name'], code: z.ZodIssueCode.custom, message: 'required' });
  }
});

type RuleFormValues = z.infer<typeof ruleSchema>;

// Preset types
type HttpStatusPreset  = '2xx' | '4xx' | '5xx' | 'custom';
type ResponseTimePreset = 1000 | 3000 | 5000 | 10000 | 'custom';
type DurationChip       = 1 | 3 | 5 | 'custom';
type CooldownChip       = 300 | 900 | 1800 | 3600 | 'custom';
type ResourceThresholdChip = 70 | 80 | 90 | 95 | 'custom';
type ResourceDurationChip  = 1 | 3 | 5 | 10 | 'custom';

const OPERATOR_SYMBOLS: Record<string, string> = {
  gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=',
};

const SEVERITY_STYLES = {
  critical: 'peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-600 dark:peer-checked:bg-red-900/20 dark:peer-checked:text-red-400',
  warning:  'peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-600 dark:peer-checked:bg-amber-900/20 dark:peer-checked:text-amber-400',
  info:     'peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-600 dark:peer-checked:bg-blue-900/20 dark:peer-checked:text-blue-400',
};

// ── Helpers ───────────────────────────────────────────────────────────────

function detectHttpStatusPreset(operator: string, threshold: number): HttpStatusPreset {
  if (operator === 'lte' && threshold === 299) return '2xx';
  if (operator === 'gte' && threshold === 400)  return '4xx';
  if (operator === 'gte' && threshold === 500)  return '5xx';
  return 'custom';
}
function detectResponseTimePreset(threshold: number): ResponseTimePreset {
  return [1000, 3000, 5000, 10000].includes(threshold)
    ? (threshold as ResponseTimePreset) : 'custom';
}
function detectDurationChip(n: number): DurationChip {
  return [1, 3, 5].includes(n) ? (n as DurationChip) : 'custom';
}
function detectCooldownChip(n: number): CooldownChip {
  return [300, 900, 1800, 3600].includes(n) ? (n as CooldownChip) : 'custom';
}
function detectResourceThresholdChip(n: number): ResourceThresholdChip {
  return [70, 80, 90, 95].includes(n) ? (n as ResourceThresholdChip) : 'custom';
}
function detectResourceDurationChip(n: number): ResourceDurationChip {
  return [1, 3, 5, 10].includes(n) ? (n as ResourceDurationChip) : 'custom';
}

// ── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <MaterialIcon name={icon} className="text-base text-primary" />
      <span className="text-xs font-bold uppercase tracking-widest text-primary">{label}</span>
      <div className="flex-1 h-px bg-primary/20" />
    </div>
  );
}

function ChipButton({ label, selected, onClick, small }: { label: string; selected: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-semibold border-2 rounded-lg transition-all cursor-pointer ${
        small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface AlertRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rule?: AlertRule;
  channels: NotificationChannel[];
}

export function AlertRuleModal({ isOpen, onClose, onSuccess, rule, channels }: AlertRuleModalProps) {
  const { t } = useTranslation();
  const isEdit = !!rule;
  const [services, setServices] = useState<Service[]>([]);

  const [httpStatusPreset,     setHttpStatusPreset]     = useState<HttpStatusPreset>('4xx');
  const [responseTimePreset,   setResponseTimePreset]   = useState<ResponseTimePreset>(3000);
  const [durationChip,         setDurationChip]         = useState<DurationChip>(3);
  const [cooldownChip,         setCooldownChip]         = useState<CooldownChip>(300);
  const [resourceThresholdChip, setResourceThresholdChip] = useState<ResourceThresholdChip>(80);
  const [resourceDurationChip,  setResourceDurationChip]  = useState<ResourceDurationChip>(3);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '', ruleCategory: 'endpoint', metric: 'http_status',
      serviceId: undefined, operator: 'gte', threshold: 400,
      duration: 3, severity: 'warning', cooldown: 300, channelIds: [],
    },
  });

  const watchedCategory   = watch('ruleCategory');
  const watchedMetric     = watch('metric');
  const watchedOperator   = watch('operator');
  const watchedThreshold  = watch('threshold');
  const watchedDuration   = watch('duration');
  const watchedServiceId  = watch('serviceId');
  const watchedChannelIds = watch('channelIds');

  useEffect(() => {
    if (isOpen) api.getServices().then(setServices).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (rule) {
      const isEndpoint = rule.type === 'service';
      const metric = rule.metric as RuleFormValues['metric'];
      reset({
        name: rule.name,
        ruleCategory: isEndpoint ? 'endpoint' : 'resource',
        metric,
        serviceId: rule.serviceId ?? undefined,
        operator: rule.operator,
        threshold: rule.threshold,
        duration: rule.duration,
        severity: rule.severity,
        cooldown: rule.cooldown,
        channelIds: rule.channelIds || [],
      });
      if (isEndpoint) {
        if (metric === 'http_status')   setHttpStatusPreset(detectHttpStatusPreset(rule.operator, rule.threshold));
        if (metric === 'response_time') setResponseTimePreset(detectResponseTimePreset(rule.threshold));
        setDurationChip(detectDurationChip(rule.duration));
      } else {
        setResourceThresholdChip(detectResourceThresholdChip(rule.threshold));
        setResourceDurationChip(detectResourceDurationChip(rule.duration));
      }
      setCooldownChip(detectCooldownChip(rule.cooldown));
    } else {
      reset({
        name: '', ruleCategory: 'endpoint', metric: 'http_status',
        serviceId: undefined, operator: 'gte', threshold: 400,
        duration: 3, severity: 'warning', cooldown: 300, channelIds: [],
      });
      setHttpStatusPreset('4xx');
      setResponseTimePreset(3000);
      setDurationChip(3);
      setCooldownChip(300);
      setResourceThresholdChip(80);
      setResourceDurationChip(3);
    }
  }, [isOpen, rule, reset]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCategoryChange = (cat: 'resource' | 'endpoint') => {
    setValue('ruleCategory', cat);
    if (cat === 'resource') {
      setValue('metric', 'cpu');
      setValue('operator', 'gt');
      setValue('threshold', 80);
      setValue('duration', 3);
      setResourceThresholdChip(80);
      setResourceDurationChip(3);
    } else {
      setValue('metric', 'http_status');
      setValue('operator', 'gte');
      setValue('threshold', 400);
      setValue('duration', 3);
      setHttpStatusPreset('4xx');
      setDurationChip(3);
    }
  };

  const handleEndpointMetricChange = (m: 'http_status' | 'response_time') => {
    setValue('metric', m);
    if (m === 'http_status') {
      setValue('operator', 'gte'); setValue('threshold', 400);
      setHttpStatusPreset('4xx');
    } else {
      setValue('operator', 'gt'); setValue('threshold', 3000);
      setResponseTimePreset(3000);
    }
  };

  const selectHttpStatusPreset = (preset: HttpStatusPreset) => {
    setHttpStatusPreset(preset);
    if (preset === '2xx') { setValue('operator', 'lte'); setValue('threshold', 299); }
    if (preset === '4xx') { setValue('operator', 'gte'); setValue('threshold', 400); }
    if (preset === '5xx') { setValue('operator', 'gte'); setValue('threshold', 500); }
  };

  const selectResponseTimePreset = (val: ResponseTimePreset) => {
    setResponseTimePreset(val);
    if (val !== 'custom') { setValue('operator', 'gt'); setValue('threshold', val); }
  };

  const selectDurationChip = (val: DurationChip) => {
    setDurationChip(val);
    if (val !== 'custom') setValue('duration', val);
  };

  const selectCooldownChip = (val: CooldownChip) => {
    setCooldownChip(val);
    if (val !== 'custom') setValue('cooldown', val);
  };

  const selectResourceThresholdChip = (val: ResourceThresholdChip) => {
    setResourceThresholdChip(val);
    if (val !== 'custom') setValue('threshold', val);
  };

  const selectResourceDurationChip = (val: ResourceDurationChip) => {
    setResourceDurationChip(val);
    if (val !== 'custom') setValue('duration', val);
  };

  const toggleChannel = (channelId: string) => {
    const current = watchedChannelIds || [];
    setValue('channelIds', current.includes(channelId)
      ? current.filter(id => id !== channelId)
      : [...current, channelId]);
  };

  const onSubmit = async (data: RuleFormValues) => {
    try {
      const isEndpoint = data.ruleCategory === 'endpoint';
      const payload = {
        name: data.name,
        type: isEndpoint ? 'service' as const : 'resource' as const,
        metric: data.metric,
        serviceId: isEndpoint ? data.serviceId : undefined,
        operator: data.operator,
        threshold: data.threshold,
        duration: data.duration,
        severity: data.severity,
        cooldown: data.cooldown,
        channelIds: data.channelIds,
      };
      if (isEdit && rule) {
        await api.updateAlertRule(rule.id, payload);
        toast.success(t('alerts.rules.updated'));
      } else {
        await api.createAlertRule(payload);
        toast.success(t('alerts.rules.created'));
      }
      onSuccess();
      onClose();
    } catch {
      toast.error(t(isEdit ? 'alerts.rules.updateFailed' : 'alerts.rules.createFailed'));
    }
  };

  if (!isOpen) return null;

  const isEndpoint = watchedCategory === 'endpoint';

  // Preview
  const metricName = { cpu: 'CPU', memory: 'Memory', disk: 'Disk', http_status: 'HTTP Status', response_time: 'Response Time' }[watchedMetric] ?? watchedMetric;
  const thresholdUnit = watchedMetric === 'response_time' ? 'ms' : watchedMetric === 'http_status' ? '' : '%';
  const selectedService = services.find(s => s.id === watchedServiceId);
  const previewText = `${metricName} ${OPERATOR_SYMBOLS[watchedOperator] ?? '>'} ${watchedThreshold}${thresholdUnit}`
    + (isEndpoint ? ` — ${watchedDuration}× [${selectedService?.name ?? '...'}]` : ` — ${watchedDuration}min`);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEdit ? t('alerts.rules.editTitle') : t('alerts.rules.newTitle')}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" aria-label="Close">
            <MaterialIcon name="close" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Section 1: Target ── */}
          <section>
            <SectionHeader icon="target" label={t('alerts.rules.sectionTarget')} />

            {/* Rule Type — Endpoint first */}
            <div className="flex gap-2 mb-4">
              {([
                { value: 'endpoint' as const, label: t('alerts.rules.endpointHealth'), icon: 'http' },
                { value: 'resource' as const, label: t('alerts.rules.serverResource'), icon: 'memory' },
              ]).map(cat => (
                <button key={cat.value} type="button" onClick={() => handleCategoryChange(cat.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold border-2 rounded-xl transition-all cursor-pointer ${
                    watchedCategory === cat.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}>
                  <MaterialIcon name={cat.icon} className="text-base" />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Service dropdown (endpoint only) */}
            {isEndpoint && (
              <div className="mb-4">
                <label htmlFor="rule-service" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('alerts.rules.service')}
                </label>
                <select id="rule-service" {...register('serviceId')}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors ${
                    errors.serviceId ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                  <option value="">{t('alerts.rules.selectService')}</option>
                  {services.map(svc => <option key={svc.id} value={svc.id}>{svc.name}</option>)}
                </select>
                {errors.serviceId && <p className="text-red-500 text-xs mt-1">{t('alerts.rules.serviceRequired')}</p>}
              </div>
            )}

            {/* Metric */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t('alerts.rules.metric')}
              </label>
              {!isEndpoint ? (
                <div className="grid grid-cols-3 gap-2">
                  {(['cpu', 'memory', 'disk'] as const).map(m => (
                    <label key={m} className="cursor-pointer">
                      <input type="radio" value={m} {...register('metric')} className="peer sr-only" />
                      <div className="py-2 text-center text-sm font-bold border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary text-slate-500 dark:text-slate-400 transition-all">
                        {m.toUpperCase()}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'http_status' as const, label: t('alerts.rules.httpStatus'), icon: 'tag' },
                    { value: 'response_time' as const, label: t('alerts.rules.responseTime'), icon: 'timer' },
                  ]).map(m => (
                    <button key={m.value} type="button" onClick={() => handleEndpointMetricChange(m.value)}
                      className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-2 rounded-xl transition-all cursor-pointer ${
                        watchedMetric === m.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}>
                      <MaterialIcon name={m.icon} className="text-sm" />
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rule name */}
            <div>
              <label htmlFor="rule-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('alerts.rules.ruleName')}
              </label>
              <input id="rule-name" {...register('name')}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors ${
                  errors.name ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'
                }`}
                placeholder={isEndpoint ? t('alerts.rules.ruleNamePlaceholderEndpoint') : t('alerts.rules.ruleNamePlaceholderResource')}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{t('alerts.rules.nameRequired')}</p>}
            </div>
          </section>

          {/* ── Section 2: Condition ── */}
          <section>
            <SectionHeader icon="rule" label={t('alerts.rules.sectionCondition')} />

            {isEndpoint ? (
              <>
                {/* HTTP Status → 4 preset cards (2×2) */}
                {watchedMetric === 'http_status' && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('alerts.rules.statusCondition')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Normal (2xx) — for testing */}
                      <button type="button" onClick={() => selectHttpStatusPreset('2xx')}
                        className={`flex items-center gap-3 p-3 border-2 rounded-xl transition-all cursor-pointer ${
                          httpStatusPreset === '2xx'
                            ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}>
                        <MaterialIcon name="check_circle" className={`text-xl shrink-0 ${httpStatusPreset === '2xx' ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`} />
                        <div className="text-left">
                          <p className={`text-xs font-bold leading-tight ${httpStatusPreset === '2xx' ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {t('alerts.rules.normalResponse')}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{t('alerts.rules.normalResponseDesc')}</p>
                        </div>
                      </button>

                      {/* Any Error (4xx/5xx) */}
                      <button type="button" onClick={() => selectHttpStatusPreset('4xx')}
                        className={`flex items-center gap-3 p-3 border-2 rounded-xl transition-all cursor-pointer ${
                          httpStatusPreset === '4xx'
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}>
                        <MaterialIcon name="warning" className={`text-xl shrink-0 ${httpStatusPreset === '4xx' ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                        <div className="text-left">
                          <p className={`text-xs font-bold leading-tight ${httpStatusPreset === '4xx' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {t('alerts.rules.anyError')}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">4xx / 5xx</p>
                        </div>
                      </button>

                      {/* Server Error (5xx) */}
                      <button type="button" onClick={() => selectHttpStatusPreset('5xx')}
                        className={`flex items-center gap-3 p-3 border-2 rounded-xl transition-all cursor-pointer ${
                          httpStatusPreset === '5xx'
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}>
                        <MaterialIcon name="error" className={`text-xl shrink-0 ${httpStatusPreset === '5xx' ? 'text-red-500' : 'text-slate-300 dark:text-slate-600'}`} />
                        <div className="text-left">
                          <p className={`text-xs font-bold leading-tight ${httpStatusPreset === '5xx' ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {t('alerts.rules.serverError')}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">5xx only</p>
                        </div>
                      </button>

                      {/* Custom */}
                      <button type="button" onClick={() => selectHttpStatusPreset('custom')}
                        className={`flex items-center gap-3 p-3 border-2 rounded-xl transition-all cursor-pointer ${
                          httpStatusPreset === 'custom'
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}>
                        <MaterialIcon name="tune" className={`text-xl shrink-0 ${httpStatusPreset === 'custom' ? 'text-primary' : 'text-slate-300 dark:text-slate-600'}`} />
                        <div className="text-left">
                          <p className={`text-xs font-bold leading-tight ${httpStatusPreset === 'custom' ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>
                            {t('alerts.rules.custom')}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">≥ ___</p>
                        </div>
                      </button>
                    </div>

                    {/* Custom HTTP status fields */}
                    {httpStatusPreset === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <label htmlFor="rule-operator" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('alerts.rules.operator')}
                          </label>
                          <select id="rule-operator" {...register('operator')}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary">
                            <option value="gt">&gt; (greater than)</option>
                            <option value="gte">&ge; (at least)</option>
                            <option value="lt">&lt; (less than)</option>
                            <option value="lte">&le; (at most)</option>
                            <option value="eq">= (equal to)</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="rule-threshold" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('alerts.rules.thresholdStatus')}
                          </label>
                          <input id="rule-threshold" type="number" {...register('threshold', { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            min={100} max={599} placeholder="e.g. 400" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Response Time → chips */}
                {watchedMetric === 'response_time' && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('alerts.rules.responseTimeCondition')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { val: 1000 as ResponseTimePreset, label: '1s' },
                        { val: 3000 as ResponseTimePreset, label: '3s' },
                        { val: 5000 as ResponseTimePreset, label: '5s' },
                        { val: 10000 as ResponseTimePreset, label: '10s' },
                        { val: 'custom' as ResponseTimePreset, label: t('alerts.rules.custom') },
                      ]).map(item => (
                        <ChipButton key={String(item.val)} label={item.label}
                          selected={responseTimePreset === item.val}
                          onClick={() => selectResponseTimePreset(item.val)} />
                      ))}
                    </div>
                    {responseTimePreset === 'custom' ? (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <label htmlFor="rule-rt-op" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('alerts.rules.operator')}
                          </label>
                          <select id="rule-rt-op" {...register('operator')}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary">
                            <option value="gt">&gt;</option>
                            <option value="gte">&ge;</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="rule-rt-threshold" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('alerts.rules.thresholdMs')}
                          </label>
                          <input id="rule-rt-threshold" type="number" {...register('threshold', { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            min={1} placeholder="e.g. 2500" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1.5">{t('alerts.rules.responseTimeHint')}</p>
                    )}
                  </div>
                )}

                {/* Sensitivity: duration chips */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('alerts.rules.alertSensitivity')}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-1.5">
                    <ChipButton label={t('alerts.rules.sensitivityImmediate')} selected={durationChip === 1} onClick={() => selectDurationChip(1)} />
                    <ChipButton label="3×" selected={durationChip === 3} onClick={() => selectDurationChip(3)} />
                    <ChipButton label="5×" selected={durationChip === 5} onClick={() => selectDurationChip(5)} />
                    <ChipButton label={t('alerts.rules.custom')} selected={durationChip === 'custom'} onClick={() => selectDurationChip('custom')} />
                  </div>
                  {durationChip === 'custom' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" {...register('duration', { valueAsNumber: true })}
                        className="w-20 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        min={1} max={10} />
                      <span className="text-sm text-slate-400">× failures</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {t('alerts.rules.sensitivityHint', { count: durationChip })}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* ── Resource mode: chips for everything ── */
              <>
                {/* Alert When: operator chips + threshold chips */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('alerts.rules.alertWhen')}
                  </p>

                  {/* Operator chips row */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-400 shrink-0">{watchedMetric.toUpperCase()}</span>
                    {(['gt', 'gte', 'lt', 'lte'] as const).map(op => (
                      <ChipButton key={op} label={OPERATOR_SYMBOLS[op]} small
                        selected={watchedOperator === op}
                        onClick={() => setValue('operator', op)} />
                    ))}
                    <span className="text-xs text-slate-400">...</span>
                  </div>

                  {/* Threshold chips */}
                  <div className="flex flex-wrap gap-2 mb-1.5">
                    {([70, 80, 90, 95] as const).map(n => (
                      <ChipButton key={n} label={`${n}%`}
                        selected={resourceThresholdChip === n}
                        onClick={() => selectResourceThresholdChip(n)} />
                    ))}
                    <ChipButton label={t('alerts.rules.custom')}
                      selected={resourceThresholdChip === 'custom'}
                      onClick={() => selectResourceThresholdChip('custom')} />
                  </div>
                  {resourceThresholdChip === 'custom' && (
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" {...register('threshold', { valueAsNumber: true })}
                        className="w-20 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        min={0} max={100} />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  )}
                </div>

                {/* Duration chips */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('alerts.rules.duration')}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-1.5">
                    {([1, 3, 5, 10] as const).map(n => (
                      <ChipButton key={n} label={`${n}min`}
                        selected={resourceDurationChip === n}
                        onClick={() => selectResourceDurationChip(n)} />
                    ))}
                    <ChipButton label={t('alerts.rules.custom')}
                      selected={resourceDurationChip === 'custom'}
                      onClick={() => selectResourceDurationChip('custom')} />
                  </div>
                  {resourceDurationChip === 'custom' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" {...register('duration', { valueAsNumber: true })}
                        className="w-20 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        min={1} max={60} />
                      <span className="text-sm text-slate-400">min</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{t('alerts.rules.durationHint')}</p>
                  )}
                </div>
              </>
            )}

            {/* Rule preview */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {t('alerts.rules.preview')}
              </p>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-200 break-all">{previewText}</p>
            </div>
          </section>

          {/* ── Section 3: Notification ── */}
          <section>
            <SectionHeader icon="notifications" label={t('alerts.rules.sectionNotification')} />

            {/* Cooldown chips */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t('alerts.rules.cooldownTitle')}
              </p>
              <div className="flex flex-wrap gap-2 mb-1.5">
                {([
                  { val: 300 as CooldownChip, label: '5min' },
                  { val: 900 as CooldownChip, label: '15min' },
                  { val: 1800 as CooldownChip, label: '30min' },
                  { val: 3600 as CooldownChip, label: '1hr' },
                ]).map(item => (
                  <ChipButton key={item.val} label={item.label}
                    selected={cooldownChip === item.val}
                    onClick={() => selectCooldownChip(item.val)} />
                ))}
                <ChipButton label={t('alerts.rules.custom')} selected={cooldownChip === 'custom'} onClick={() => selectCooldownChip('custom')} />
              </div>
              {cooldownChip === 'custom' && (
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" {...register('cooldown', { valueAsNumber: true })}
                    className="w-24 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    min={60} max={86400} />
                  <span className="text-sm text-slate-400">sec</span>
                </div>
              )}
            </div>

            {/* Severity */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t('alerts.rules.severity')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'critical' as const, label: t('alerts.rules.critical') },
                  { value: 'warning' as const,  label: t('alerts.rules.warning') },
                  { value: 'info' as const,      label: t('alerts.rules.info') },
                ]).map(s => (
                  <label key={s.value} className="cursor-pointer">
                    <input type="radio" value={s.value} {...register('severity')} className="peer sr-only" />
                    <div className={`py-2 text-center text-sm font-bold border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer ${SEVERITY_STYLES[s.value]} transition-all`}>
                      {s.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t('alerts.rules.notifyChannels')}
                <span className="font-normal text-slate-400 ml-1.5 text-xs">({t('alerts.rules.allChannels')})</span>
              </label>
              {channels.length === 0 ? (
                <p className="text-sm text-slate-400 italic">{t('alerts.rules.noChannels')}</p>
              ) : (
                <div className="space-y-2">
                  {channels.map(ch => {
                    const isSelected = (watchedChannelIds || []).includes(ch.id);
                    return (
                      <button key={ch.id} type="button" onClick={() => toggleChannel(ch.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 border-2 rounded-xl cursor-pointer transition-all text-left ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}>
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                          {isSelected && <MaterialIcon name="check" className="text-white text-sm" />}
                        </div>
                        <MaterialIcon name={ch.type === 'telegram' ? 'send' : 'sports_esports'} className={`text-base shrink-0 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1">{ch.name}</span>
                        <span className="text-xs text-slate-400 capitalize">{ch.type}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
            {t('alerts.rules.cancel')}
          </button>
          <button type="button" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}
            className="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer">
            {isSubmitting ? t('alerts.rules.saving') : isEdit ? t('alerts.rules.update') : t('alerts.rules.create')}
          </button>
        </div>

      </div>
    </div>
  );
}
