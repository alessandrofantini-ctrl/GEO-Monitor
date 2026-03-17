'use client';

interface StatusBadgeProps {
  isMentioned: boolean;
  isFirst: boolean;
}

export function StatusBadge({ isMentioned, isFirst }: StatusBadgeProps) {
  if (isFirst) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
        Prima menzione
      </span>
    );
  }
  if (isMentioned) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-[#BA7517]/10 text-[#BA7517] border border-[#BA7517]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#BA7517]" />
        Menzionato
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-[#D85A30]/10 text-[#D85A30] border border-[#D85A30]/30">
      <span className="w-1.5 h-1.5 rounded-full bg-[#D85A30]" />
      Non menzionato
    </span>
  );
}
