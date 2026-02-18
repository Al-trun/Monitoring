import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMonitoringTrends } from '../../../hooks/useData';
import { Skeleton } from '../../../components/skeleton';

interface ResourceTrendsProps {
  hostId: string;
}

export function ResourceTrends({ hostId }: ResourceTrendsProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<'6H' | '12H' | '24H'>('6H');
  const { data: charts, loading } = useMonitoringTrends(hostId, timeRange.toLowerCase());

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
          {t('monitoring.trends.title')} ({t('monitoring.trends.last6h')})
        </h2>
        <div className="flex bg-slate-100 dark:bg-[#283039] rounded-lg p-1">
          {(['6H', '12H', '24H'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeRange === range
                  ? 'bg-white dark:bg-[#101922] text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-[#9dabb9] hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {(charts || []).map((chart) => (
          <div
            key={chart.title}
            className="flex flex-col gap-4 rounded-xl p-6 border border-slate-200 dark:border-[#3b4754] bg-white dark:bg-[#1e293b]/30"
          >
            {/* Chart Header */}
            <div className="flex justify-between items-center">
              <span className="text-slate-900 dark:text-white font-bold">{chart.title}</span>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
                {chart.legends.map((legend) => (
                  <div key={legend.label} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${legend.color}`} />
                    <span className="text-slate-600 dark:text-slate-300">{legend.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="h-48 w-full relative border-l border-b border-slate-200 dark:border-[#3b4754]">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {chart.lines.map((line, index) => (
                  <g key={index}>
                    {line.fill && (
                      <path d={line.fill} fill="rgba(19, 127, 236, 0.2)" />
                    )}
                    <polyline
                      points={line.points}
                      fill="none"
                      stroke={line.color}
                      strokeWidth="2"
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        ))}
      </div>
      )}
    </>
  );
}
