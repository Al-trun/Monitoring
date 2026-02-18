/**
 * Mock data for resource trend charts
 * Used by: ResourceTrends component
 */

export interface ChartData {
  title: string;
  legends: { color: string; label: string }[];
  lines: { points: string; color: string; fill?: string }[];
}

export const mockCharts: ChartData[] = [
  {
    title: 'CPU Usage',
    legends: [
      { color: 'bg-primary', label: 'User' },
      { color: 'bg-lime-400', label: 'System' },
    ],
    lines: [
      { points: '0,80 10,70 20,75 30,50 40,55 50,30 60,35 70,20 80,25 90,10 100,15', color: '#137fec' },
      { points: '0,95 10,90 20,92 30,85 40,88 50,80 60,82 70,75 80,78 90,70 100,72', color: '#a3e635' },
    ],
  },
  {
    title: 'Memory Flow',
    legends: [
      { color: 'bg-primary', label: 'Used' },
      { color: 'bg-purple-500', label: 'Cached' },
    ],
    lines: [
      {
        points: '0,60 20,55 40,65 60,50 80,55 100,45',
        color: '#137fec',
        fill: 'M0,100 L0,60 L20,55 L40,65 L60,50 L80,55 L100,45 L100,100 Z',
      },
      { points: '0,40 20,35 40,45 60,30 80,35 100,25', color: '#a855f7' },
    ],
  },
  {
    title: 'Disk I/O (IOPS)',
    legends: [
      { color: 'bg-lime-400', label: 'Read' },
      { color: 'bg-orange-500', label: 'Write' },
    ],
    lines: [
      {
        points: '0,95 5,80 10,95 15,70 20,95 25,60 30,95 35,50 40,95 45,65 50,95 55,75 60,95 65,85 70,95 75,90 80,95 85,70 90,95 95,80 100,95',
        color: '#a3e635',
      },
      {
        points: '0,98 5,90 10,98 15,92 20,98 25,95 30,98 35,93 40,98 45,91 50,98 55,94 60,98 65,92 70,98 75,95 80,98 85,91 90,98 95,94 100,98',
        color: '#f97316',
      },
    ],
  },
];
