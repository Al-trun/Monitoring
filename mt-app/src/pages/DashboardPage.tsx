import { KPISummary, ServiceHealthGrid, IncidentTimeline, NotificationChannelStatus, AlertRulesStatus } from '../features/dashboard';

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <KPISummary />
      <ServiceHealthGrid />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotificationChannelStatus />
        <AlertRulesStatus />
      </div>
      <IncidentTimeline />
    </div>
  );
}
