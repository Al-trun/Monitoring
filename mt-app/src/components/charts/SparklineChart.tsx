import { getCSSVariable } from '../../design-tokens/colors';

interface SparklineChartProps {
  data: number[];
  color?: string;
}

export function SparklineChart({ data, color = getCSSVariable('primary') }: SparklineChartProps) {
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 20 - (value / 20) * 18;
      return `${x} ${y}`;
    })
    .join(' L');

  return (
    <div className="h-12 w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 flex items-end overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
        <path
          d={`M${points}`}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
