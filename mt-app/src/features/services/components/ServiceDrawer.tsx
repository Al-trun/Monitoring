import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { MaterialIcon, Drawer } from '../../../components/common';
import { api, Service } from '../../../services/api';

// Helper functions to convert between UI state and cron expression
function cronToScheduledParams(cronExpr: string | undefined): {
    scheduledType: 'daily' | 'weekly';
    scheduledHour: number;
    scheduledMinute: number;
    scheduledWeekday: number;
} {
    if (!cronExpr) return { scheduledType: 'daily', scheduledHour: 9, scheduledMinute: 0, scheduledWeekday: 1 };

    // M H * * DOW → Weekly (0–6)
    const weeklyMatch = cronExpr.match(/^(\d+) (\d+) \* \* ([0-6])$/);
    if (weeklyMatch) {
        return {
            scheduledType: 'weekly',
            scheduledMinute: parseInt(weeklyMatch[1]),
            scheduledHour: parseInt(weeklyMatch[2]),
            scheduledWeekday: parseInt(weeklyMatch[3]),
        };
    }
    // M H * * * → Daily
    const dailyMatch = cronExpr.match(/^(\d+) (\d+) \* \* \*$/);
    if (dailyMatch) {
        return {
            scheduledType: 'daily',
            scheduledMinute: parseInt(dailyMatch[1]),
            scheduledHour: parseInt(dailyMatch[2]),
            scheduledWeekday: 1,
        };
    }

    // Legacy interval-style crons (*/N * * * *, 0 */N * * *) → fallback to daily 09:00
    return { scheduledType: 'daily', scheduledHour: 9, scheduledMinute: 0, scheduledWeekday: 1 };
}

function scheduledToCron(type: 'daily' | 'weekly', hour: number, minute: number, weekday: number): string {
    if (type === 'daily') {
        return `${minute} ${hour} * * *`;
    }
    return `${minute} ${hour} * * ${weekday}`;
}

const serviceSchema = z.object({
    id: z.string().min(2, 'ID is too short').regex(/^[a-z0-9-]+$/, 'Lower case letters, numbers, and hyphens only'),
    name: z.string().min(2, 'Name is too short'),
    type: z.enum(['http', 'tcp']),
    url: z.string().optional(),
    host: z.string().optional(),
    port: z.number().optional(),
    scheduleType: z.enum(['interval', 'cron']).default('interval'),
    interval: z.number().min(5, 'Minimum interval is 5s'),
    cronExpression: z.string().optional(),
    timeout: z.number().min(500, 'Minimum timeout is 500ms'),
}).refine(data => {
    if (data.type === 'http' && !data.url) return false;
    if (data.type === 'tcp' && !data.host && !data.url) return false;
    return true;
}, {
    message: 'URL or Host is required',
    path: ['url'],
}).refine(data => {
    if (data.scheduleType === 'cron' && !data.cronExpression) return false;
    return true;
}, {
    message: 'Cron expression is required',
    path: ['cronExpression'],
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    service?: Service;
}

export function ServiceDrawer({ isOpen, onClose, onSuccess, service }: ServiceDrawerProps) {
    const { t } = useTranslation();
    const isEditMode = !!service;

    // Scheduled health check state
    const [scheduledType, setScheduledType] = useState<'daily' | 'weekly'>('daily');
    const [scheduledHour, setScheduledHour] = useState(9);
    const [scheduledMinute, setScheduledMinute] = useState(0);
    const [scheduledWeekday, setScheduledWeekday] = useState(1); // 1 = Monday

    const {
        register,
        handleSubmit,
        watch,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ServiceFormValues>({
        resolver: zodResolver(serviceSchema) as any,
        defaultValues: {
            type: 'http',
            scheduleType: 'interval',
            interval: 30,
            timeout: 5000,
        },
    });

    const selectedType = watch('type');
    const scheduleType = watch('scheduleType');

    // Reset form when drawer opens
    useEffect(() => {
        if (!isOpen) return;

        if (service) {
            reset({
                id: service.id,
                name: service.name,
                type: service.type,
                url: service.url || '',
                host: service.host || '',
                port: service.port || undefined,
                scheduleType: service.scheduleType || 'interval',
                interval: service.interval,
                cronExpression: service.cronExpression || '',
                timeout: service.timeout,
            });

            if (service.scheduleType === 'cron' && service.cronExpression) {
                const params = cronToScheduledParams(service.cronExpression);
                setScheduledType(params.scheduledType);
                setScheduledHour(params.scheduledHour);
                setScheduledMinute(params.scheduledMinute);
                setScheduledWeekday(params.scheduledWeekday);
            }
        } else {
            reset({
                id: '',
                name: '',
                type: 'http',
                url: '',
                host: '',
                port: undefined,
                scheduleType: 'interval',
                interval: parseInt(localStorage.getItem('mt-default-interval') || '30'),
                cronExpression: '',
                timeout: parseInt(localStorage.getItem('mt-default-timeout') || '5000'),
            });
            setScheduledType('daily');
            setScheduledHour(9);
            setScheduledMinute(0);
            setScheduledWeekday(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, reset]);

    const onSubmit = async (data: ServiceFormValues): Promise<void> => {
        try {
            if (data.scheduleType === 'cron') {
                data.cronExpression = scheduledToCron(scheduledType, scheduledHour, scheduledMinute, scheduledWeekday);
            }

            if (isEditMode && service) {
                await api.updateService(service.id, data as any);
                toast.success(t('dashboard.serviceAdded', { defaultValue: 'Service updated successfully' }));
            } else {
                await api.createService({ ...data, id: data.id } as any);
                toast.success(t('dashboard.serviceAdded', { defaultValue: 'Service added successfully' }));
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'add'} service`);
        }
    };

    const getInputClassName = (hasError: boolean) =>
        `w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${hasError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm`;

    const weekdays = [
        t('services.schedule.days.0'),
        t('services.schedule.days.1'),
        t('services.schedule.days.2'),
        t('services.schedule.days.3'),
        t('services.schedule.days.4'),
        t('services.schedule.days.5'),
        t('services.schedule.days.6'),
    ];

    const cronPreviewText = scheduledType === 'daily'
        ? t('services.schedule.dailyAt', { hour: scheduledHour.toString().padStart(2, '0'), minute: scheduledMinute.toString().padStart(2, '0') })
        : t('services.schedule.weeklyAt', { day: weekdays[scheduledWeekday], hour: scheduledHour.toString().padStart(2, '0'), minute: scheduledMinute.toString().padStart(2, '0') });

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? t('services.detail.manage') : t('dashboard.addService')}
            size="lg"
            centered
        >
            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                        <MaterialIcon name="info" className="text-primary text-lg" />
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('services.sections.basicInfo')}</h3>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.id')}</label>
                        <input
                            {...register('id')}
                            placeholder={t('services.addModal.idPlaceholder')}
                            disabled={isEditMode}
                            className={`${getInputClassName(!!errors.id)} ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                        {errors.id ? (
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                <MaterialIcon name="error" className="text-sm" />
                                {errors.id.message}
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MaterialIcon name="info" className="text-xs" />
                                {isEditMode ? t('monitoring.modal.idCannotChange') : t('services.addModal.idHint')}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.name')}</label>
                        <input
                            {...register('name')}
                            placeholder={t('services.addModal.namePlaceholder')}
                            className={getInputClassName(!!errors.name)}
                        />
                        {errors.name ? (
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                <MaterialIcon name="error" className="text-sm" />
                                {errors.name.message}
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MaterialIcon name="info" className="text-xs" />
                                {t('services.addModal.nameHint')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Connection Configuration Section */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                        <MaterialIcon name="settings_ethernet" className="text-primary text-lg" />
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('services.sections.connection')}</h3>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.type')}</label>
                        <div className="flex gap-2">
                            <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border cursor-pointer transition-all ${selectedType === 'http' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                <input {...register('type')} type="radio" value="http" className="hidden" />
                                <MaterialIcon name="api" className="text-lg" />
                                HTTP
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border cursor-pointer transition-all ${selectedType === 'tcp' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                <input {...register('type')} type="radio" value="tcp" className="hidden" />
                                <MaterialIcon name="dns" className="text-lg" />
                                TCP
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {selectedType === 'http' ? (
                            <div className="col-span-3 space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">URL</label>
                                <input
                                    {...register('url')}
                                    placeholder="https://api.example.com/health"
                                    className={getInputClassName(!!errors.url)}
                                />
                                {errors.url && (
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                        <MaterialIcon name="error" className="text-sm" />
                                        {errors.url.message}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="col-span-3 sm:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Host</label>
                                    <input
                                        {...register('host')}
                                        placeholder="8.8.8.8"
                                        className={getInputClassName(!!errors.host)}
                                    />
                                    {errors.host && (
                                        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                            <MaterialIcon name="error" className="text-sm" />
                                            {errors.host.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('services.schedule.port')}</label>
                                    <input
                                        {...register('port', { valueAsNumber: true })}
                                        type="number"
                                        placeholder="53"
                                        className={getInputClassName(!!errors.port)}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Health Check Schedule Section */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                        <MaterialIcon name="schedule" className="text-primary text-lg" />
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('services.sections.healthCheckSchedule')}</h3>
                    </div>

                    {/* Schedule type toggle */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('services.schedule.type')}</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border cursor-pointer transition-all ${scheduleType === 'interval' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                <input {...register('scheduleType')} type="radio" value="interval" className="hidden" />
                                <MaterialIcon name="schedule" className="text-lg" />
                                {t('services.schedule.typeInterval')}
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border cursor-pointer transition-all ${scheduleType === 'cron' ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                <input {...register('scheduleType')} type="radio" value="cron" className="hidden" />
                                <MaterialIcon name="calendar_month" className="text-lg" />
                                {t('services.schedule.typeScheduled')}
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {scheduleType === 'interval'
                                ? t('services.schedule.intervalHint')
                                : t('services.schedule.scheduledHint')
                            }
                        </p>
                    </div>

                    {scheduleType === 'interval' ? (
                        /* ── Interval mode ─────────────────────────── */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('services.schedule.interval')} (s)</label>
                                <input
                                    {...register('interval', { valueAsNumber: true })}
                                    type="number"
                                    placeholder="30"
                                    className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${errors.interval ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm`}
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('services.schedule.intervalDescription')}</p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">{t('services.schedule.quickSet')}:</span>
                                    {[
                                        { label: '10s', value: 10 },
                                        { label: '30s', value: 30 },
                                        { label: '1m',  value: 60 },
                                        { label: '5m',  value: 300 },
                                        { label: '1h',  value: 3600 },
                                    ].map(({ label, value }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setValue('interval', value)}
                                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary rounded-md transition-colors"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {errors.interval && (
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                        <MaterialIcon name="error" className="text-sm" />
                                        {errors.interval.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('services.schedule.timeout')} (ms)</label>
                                <input
                                    {...register('timeout', { valueAsNumber: true })}
                                    type="number"
                                    placeholder="5000"
                                    className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${errors.timeout ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm`}
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('services.schedule.timeoutDescription')}</p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">{t('services.schedule.quickSet')}:</span>
                                    {[
                                        { label: '1s',  value: 1000 },
                                        { label: '3s',  value: 3000 },
                                        { label: '5s',  value: 5000 },
                                        { label: '10s', value: 10000 },
                                    ].map(({ label, value }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setValue('timeout', value)}
                                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary rounded-md transition-colors"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {errors.timeout && (
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                        <MaterialIcon name="error" className="text-sm" />
                                        {errors.timeout.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ── Scheduled (cron) mode ──────────────────── */
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('services.schedule.scheduledType')}</label>
                                <div className="space-y-2">
                                    {/* Daily option */}
                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${scheduledType === 'daily' ? 'bg-primary/5 border-primary' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                        <input
                                            type="radio"
                                            checked={scheduledType === 'daily'}
                                            onChange={() => setScheduledType('daily')}
                                            className="text-primary focus:ring-primary mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <MaterialIcon name="event" className="text-lg" />
                                                <span className="font-medium text-sm">{t('services.schedule.scheduledTypeDaily')}</span>
                                            </div>
                                            {scheduledType === 'daily' && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 w-6">{t('services.schedule.timeHour')}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="23"
                                                        value={scheduledHour}
                                                        onChange={(e) => setScheduledHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                                                        className="w-16 px-2 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-center font-mono"
                                                    />
                                                    <span className="text-slate-400 font-bold">:</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="59"
                                                        value={scheduledMinute}
                                                        onChange={(e) => setScheduledMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                                        className="w-16 px-2 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-center font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    {/* Weekly option */}
                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${scheduledType === 'weekly' ? 'bg-primary/5 border-primary' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                        <input
                                            type="radio"
                                            checked={scheduledType === 'weekly'}
                                            onChange={() => setScheduledType('weekly')}
                                            className="text-primary focus:ring-primary mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <MaterialIcon name="date_range" className="text-lg" />
                                                <span className="font-medium text-sm">{t('services.schedule.scheduledTypeWeekly')}</span>
                                            </div>
                                            {scheduledType === 'weekly' && (
                                                <div className="mt-3 space-y-3">
                                                    {/* Weekday selector */}
                                                    <div className="flex gap-1">
                                                        {weekdays.map((day, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => setScheduledWeekday(idx)}
                                                                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${scheduledWeekday === idx
                                                                    ? 'bg-primary text-white'
                                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary'
                                                                }`}
                                                            >
                                                                {day}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Time picker */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500 w-6">{t('services.schedule.timeHour')}</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="23"
                                                            value={scheduledHour}
                                                            onChange={(e) => setScheduledHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                                                            className="w-16 px-2 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-center font-mono"
                                                        />
                                                        <span className="text-slate-400 font-bold">:</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="59"
                                                            value={scheduledMinute}
                                                            onChange={(e) => setScheduledMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                                            className="w-16 px-2 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm text-center font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Cron preview */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
                                    <MaterialIcon name="code" className="text-sm" />
                                    {t('services.sections.generatedCron')}
                                </div>
                                <code className="block text-sm font-mono text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 px-3 py-2 rounded">
                                    {scheduledToCron(scheduledType, scheduledHour, scheduledMinute, scheduledWeekday)}
                                </code>
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                    {cronPreviewText}
                                </div>
                            </div>

                            {/* Timeout */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('services.schedule.timeout')} (ms)</label>
                                <input
                                    {...register('timeout', { valueAsNumber: true })}
                                    type="number"
                                    placeholder="5000"
                                    className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border ${errors.timeout ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm`}
                                />
                                {errors.timeout && (
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                        <MaterialIcon name="error" className="text-sm" />
                                        {errors.timeout.message}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-8 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <MaterialIcon name="save" className="text-lg" />
                                {t('common.save')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Drawer>
    );
}
