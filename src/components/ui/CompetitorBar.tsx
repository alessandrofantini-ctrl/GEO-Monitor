'use client';

interface CompetitorBarProps {
  name: string;
  count: number;
  percentage: number;
  maxCount: number;
}

export function CompetitorBar({ name, count, percentage, maxCount }: CompetitorBarProps) {
  const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm text-gray-700 truncate flex-shrink-0">{name}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-[#7F77DD] rounded-full transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0">{percentage}%</span>
    </div>
  );
}
