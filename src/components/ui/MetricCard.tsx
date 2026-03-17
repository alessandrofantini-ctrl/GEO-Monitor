'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  color?: 'green' | 'purple' | 'coral' | 'amber' | 'neutral';
  icon?: React.ReactNode;
}

const COLOR_MAP = {
  green: 'text-[#1D9E75]',
  purple: 'text-[#7F77DD]',
  coral: 'text-[#D85A30]',
  amber: 'text-[#BA7517]',
  neutral: 'text-gray-800',
};

export function MetricCard({ label, value, subLabel, color = 'neutral', icon }: MetricCardProps) {
  return (
    <div className="bg-white border border-[#e5e5e2] rounded-xl p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <span className={`text-3xl font-bold ${COLOR_MAP[color]}`}>{value}</span>
      {subLabel && <span className="text-xs text-gray-400">{subLabel}</span>}
    </div>
  );
}
