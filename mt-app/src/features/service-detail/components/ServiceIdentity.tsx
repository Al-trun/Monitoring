import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { MaterialIcon } from '../../../components/common';

interface ServiceIdentityProps {
  name: string;
  endpoint: string;
  lastCheckedAt?: string;
  type: 'http' | 'tcp';
  status: 'online' | 'offline' | 'degraded';
  icon: string;
}

export function ServiceIdentity({
  name,
  endpoint,
  lastCheckedAt,
  type,
  status,
  icon,
}: ServiceIdentityProps) {
  const { t, i18n } = useTranslation();

  const dateLocale = useMemo(
    () => (i18n.language.startsWith('ko') ? ko : enUS),
    [i18n.language]
  );

  const statusConfig = {
    online: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      text: 'text-green-500',
      dot: 'bg-green-500',
      ping: 'bg-green-400',
      labelKey: 'common.online',
    },
    offline: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-500',
      dot: 'bg-red-500',
      ping: 'bg-red-400',
      labelKey: 'common.offline',
    },
    degraded: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-500',
      dot: 'bg-amber-500',
      ping: 'bg-amber-400',
      labelKey: 'common.degraded',
    },
  };

  const config = statusConfig[status];

  const lastCheckedText = lastCheckedAt
    ? formatDistanceToNow(new Date(lastCheckedAt), { addSuffix: true, locale: dateLocale })
    : t('common.never');

  return (
    <div className="flex items-center gap-6 mb-8 bg-slate-100/50 dark:bg-[#1e293b]/30 p-6 rounded-xl border border-slate-200 dark:border-[#283039]">
      <div className="bg-primary/20 rounded-xl p-6 flex items-center justify-center border border-primary/30">
        <MaterialIcon name={icon} className="text-5xl text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{name}</h1>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${config.bg} border ${config.border}`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.ping} opacity-75`}
              />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
            </span>
            <span className={`${config.text} text-xs font-bold uppercase tracking-wider`}>
              {t(config.labelKey)}
            </span>
          </div>
        </div>
        <p className="text-slate-500 dark:text-[#9dabb9] text-base mb-1">
          {t('services.detail.identity.endpoint')}:{' '}
          <code className="bg-slate-200 dark:bg-[#283039] px-2 py-0.5 rounded text-primary">
            {endpoint}
          </code>
        </p>
        <p className="text-slate-400 dark:text-[#6b7c8d] text-sm">
          {t('services.detail.identity.type')}: {type.toUpperCase()} | {t('services.detail.identity.lastChecked')}: {lastCheckedText}
        </p>
      </div>
    </div>
  );
}
