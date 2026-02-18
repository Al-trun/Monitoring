import type { Service } from '../../types/service';

/**
 * Mock services data for dashboard service grid
 * Used by: ServiceHealthGrid component
 */
export const mockServices: Service[] = [
  {
    id: '1',
    name: 'API Gateway',
    cluster: 'edge-cluster-01',
    status: 'healthy',
    latency: '42ms',
    uptime: '100%',
    icon: 'api',
    chartData: [15, 12, 18, 14, 16, 8, 10, 5, 12, 14, 12],
  },
  {
    id: '2',
    name: 'Auth Service',
    cluster: 'identity-v2',
    status: 'degraded',
    latency: '1,240ms',
    uptime: '98.2%',
    icon: 'lock',
    chartData: [18, 18, 18, 18, 5, 2, 5, 18, 18, 18, 18],
  },
  {
    id: '3',
    name: 'User Database',
    cluster: 'postgres-main',
    status: 'warning',
    latency: '12ms',
    uptime: '99.9%',
    icon: 'database',
    chartData: [10, 11, 10, 9, 10, 11, 10, 15, 16, 15, 14],
  },
  {
    id: '4',
    name: 'Redis Cache',
    cluster: 'cache-node-1',
    status: 'healthy',
    latency: '2ms',
    uptime: '100%',
    icon: 'memory',
    chartData: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  },
  {
    id: '5',
    name: 'Payment Worker',
    cluster: 'stripe-connector',
    status: 'healthy',
    latency: '156ms',
    uptime: '99.9%',
    icon: 'payments',
    chartData: [10, 8, 12, 7, 9, 5, 8, 10, 12, 14, 10],
  },
  {
    id: '6',
    name: 'Search Index',
    cluster: 'elastic-cluster',
    status: 'healthy',
    latency: '88ms',
    uptime: '99.5%',
    icon: 'search',
    chartData: [5, 15, 10, 15, 5, 10, 5, 15, 10, 15, 5],
  },
];
