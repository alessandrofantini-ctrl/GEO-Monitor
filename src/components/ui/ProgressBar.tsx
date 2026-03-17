'use client';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  color?: 'green' | 'purple' | 'coral';
  showLabel?: boolean;
}

const COLOR_MAP = {
  green: 'bg-[#1D9E75]',
  purple: 'bg-[#7F77DD]',
  coral: 'bg-[#D85A30]',
};

export function ProgressBar({ value, label, color = 'green', showLabel = true }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      {(label || showLabel) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-gray-500">{label}</span>}
          {showLabel && <span className="text-xs font-medium text-gray-700">{pct}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${COLOR_MAP[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
