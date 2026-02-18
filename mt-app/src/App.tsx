import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout';
import { NetworkStatusBanner } from './components/feedback/NetworkStatusBanner';
import {
  DashboardPage,
  ServiceDetailPage,
  ServicesPage,
  MonitoringPage,
  MonitoringListPage,
  AlertsSetupPage,
  SettingsPage,
  NotFoundPage
} from './pages';

function App() {
  return (
    <BrowserRouter>
      <NetworkStatusBanner />
      <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <Routes>
          {/* All pages with Sidebar */}
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
            <Route path="/monitoring" element={<MonitoringListPage />} />
            <Route path="/monitoring/:resourceId" element={<MonitoringPage />} />
<Route path="/alerts" element={<AlertsSetupPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
