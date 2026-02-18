import type { Host, SystemInfo, SystemMetricsHistory, SystemProcess } from '../services/api';
import type { GaugeData } from '../mocks/monitoring/resources.mock';
import type { ChartData } from '../mocks/monitoring/trends.mock';
import type { Process } from '../mocks/monitoring/processes.mock';
import type { Resource } from '../mocks/monitoring/resourceList.mock';

// --- Host → Resource ---
export function hostToResource(host: Host): Resource {
  const statusMap: Record<string, Resource['status']> = {
    online: 'healthy',
    offline: 'critical',
    unknown: 'warning',
    error: 'error',
  };
  return {
    id: host.id,
    name: host.name,
    type: (host.resourceCategory || 'server') as Resource['type'],
    status: statusMap[host.status] || 'warning',
    cluster: host.group,
    ip: host.ip,
    isActive: host.isActive,
    isRemote: !!host.sshUser,
    sshPort: host.sshPort,
  };
}

// --- Host[] → Resource[] ---
export function hostsToResources(hosts: Host[]): Resource[] {
  return hosts.map(hostToResource);
}

// --- SystemInfo → Resource[] (legacy, kept for backward compatibility) ---
export function systemInfoToResources(info: SystemInfo): Resource[] {
  const maxUsage = Math.max(info.cpu.usage, info.memory.usage, info.disk.usage);
  const status: Resource['status'] =
    maxUsage >= 90 ? 'critical' : maxUsage >= 80 ? 'warning' : 'healthy';

  return [
    {
      id: 'local',
      name: info.hostname,
      type: 'server',
      status,
      cluster: 'Local',
      ip: info.ip,
    },
  ];
}

// --- SystemInfo → GaugeData[] ---
export function systemInfoToGauges(info: SystemInfo): GaugeData[] {
  return [
    {
      label: 'CPU Load',
      percentage: info.cpu.usage,
      color: '#137fec',
      subtitle: `${info.cpu.cores} Cores Online`,
      trend: '',
      trendType: 'stable',
    },
    {
      label: 'Memory Usage',
      percentage: info.memory.usage,
      color: '#a3e635',
      subtitle: `${info.memory.used} GB / ${info.memory.total} GB`,
      trend: '',
      trendType: 'stable',
    },
    {
      label: 'Disk Space',
      percentage: info.disk.usage,
      color: '#f59e0b',
      subtitle: `${info.disk.used} GB / ${info.disk.total} GB`,
      trend: '',
      trendType: 'stable',
    },
  ];
}

// --- SystemMetricsHistory → ChartData[] ---
export function historyToCharts(history: SystemMetricsHistory): ChartData[] {
  const points = history.points;
  if (!points || points.length === 0) return [];

  const toPolyline = (values: number[]): string => {
    const max = Math.max(...values, 1);
    return values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * 100;
        const y = 100 - (v / max) * 100;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const cpuValues = points.map((p) => p.cpu);
  const memUsedValues = points.map((p) => p.memUsed);
  const memCachedValues = points.map((p) => p.memCached || 0);
  const diskReadValues = points.map((p) => p.diskRead);
  const diskWriteValues = points.map((p) => p.diskWrite);

  // Build fill path for memory chart
  const memPoints = toPolyline(memUsedValues);
  const memFillCoords = memUsedValues.map((v, i) => {
    const max = Math.max(...memUsedValues, 1);
    const x = (i / Math.max(memUsedValues.length - 1, 1)) * 100;
    const y = 100 - (v / max) * 100;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const memFill = `M0,100 L${memFillCoords.join(' L')} L100,100 Z`;

  return [
    {
      title: 'CPU Usage',
      legends: [{ color: 'bg-primary', label: 'Usage' }],
      lines: [{ points: toPolyline(cpuValues), color: '#137fec' }],
    },
    {
      title: 'Memory Flow',
      legends: [
        { color: 'bg-primary', label: 'Used' },
        { color: 'bg-purple-500', label: 'Cached' },
      ],
      lines: [
        { points: memPoints, color: '#137fec', fill: memFill },
        { points: toPolyline(memCachedValues), color: '#a855f7' },
      ],
    },
    {
      title: 'Disk I/O (MB/s)',
      legends: [
        { color: 'bg-lime-400', label: 'Read' },
        { color: 'bg-orange-500', label: 'Write' },
      ],
      lines: [
        { points: toPolyline(diskReadValues), color: '#a3e635' },
        { points: toPolyline(diskWriteValues), color: '#f97316' },
      ],
    },
  ];
}

// --- SystemProcess[] → Process[] ---
const iconMap: Record<string, string> = {
  postgres: 'terminal',
  postgresql: 'terminal',
  node: 'deployed_code',
  nginx: 'language',
  redis: 'database',
  docker: 'deployed_code',
  python: 'code',
  java: 'coffee',
  mysql: 'database',
  mongod: 'database',
};

export function systemProcessesToProcesses(procs: SystemProcess[]): Process[] {
  return procs.map((p, i) => {
    const baseName = p.name.split(/[-_.]/)[0].toLowerCase();
    const statusMap: Record<string, Process['status']> = {
      running: 'RUNNING',
      sleeping: 'IDLE',
      stopped: 'STOPPED',
      zombie: 'STOPPED',
    };

    return {
      id: String(i + 1),
      name: p.name,
      icon: iconMap[baseName] || 'terminal',
      pid: String(p.pid),
      cpu: `${p.cpu}%`,
      cpuHighlight: p.cpu >= 15,
      memory: p.memory,
      status: statusMap[p.status] || 'RUNNING',
    };
  });
}
