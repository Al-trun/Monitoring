import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MaterialIcon, EmptyState } from '../../../components/common';
import { ServiceCard } from './ServiceCard';
import { useDashboardServices } from '../../../hooks/useData';
import { ServiceCardSkeleton } from '../../../components/skeleton';

interface ServiceHealthGridProps {
  hideHeader?: boolean;
  searchQuery?: string;
  statusFilter?: string;
  refreshKey?: number;
}

export function ServiceHealthGrid({
  hideHeader = false,
  searchQuery = '',
  statusFilter = '',
  refreshKey = 0
}: ServiceHealthGridProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: services, loading, error, refetch } = useDashboardServices();

  useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  const filteredServices = (services || []).filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cluster.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <MaterialIcon name="dns" className="text-xl text-primary" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('dashboard.serviceHealth.title')}
            </h2>
            {!loading && services && services.length > 0 && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {services.length}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/services', { state: { openAddModal: true } })}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium transition-all shadow-sm"
            >
              <MaterialIcon name="add" className="text-sm" />
              {t('dashboard.addService')}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-red-500 p-4">
          {t('common.error')}: {error.message}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!services || services.length === 0) && (
        <EmptyState
          icon="dns"
          title={t('dashboard.emptyState')}
          description={t('dashboard.emptyStateDesc', { defaultValue: 'Add your first service to start monitoring.' })}
          action={{
            label: t('dashboard.addService'),
            onClick: () => navigate('/services'),
          }}
        />
      )}

      {/* Grid */}
      {!loading && !error && filteredServices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onClick={() => navigate(`/services/${service.id}`)}
            />
          ))}
        </div>
      )}

      {/* No search results */}
      {!loading && !error && services && services.length > 0 && filteredServices.length === 0 && (
        <div className="py-20 text-center">
          <MaterialIcon name="search_off" className="text-5xl text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">{t('logs.noResults')}</p>
        </div>
      )}
    </div>
  );
}
