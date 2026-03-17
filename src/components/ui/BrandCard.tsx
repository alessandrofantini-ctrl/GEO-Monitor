'use client';

import Link from 'next/link';
import { getMentionRateBadgeClass, formatDate } from '@/lib/utils';

interface BrandCardProps {
  id: string;
  name: string;
  url: string;
  sector: string;
  mentionRate?: number;
  lastAnalysis?: string | Date | null;
  totalRuns?: number;
}

export function BrandCard({
  id,
  name,
  url,
  sector,
  mentionRate,
  lastAnalysis,
  totalRuns = 0,
}: BrandCardProps) {
  const domain = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <Link href={`/brands/${id}`} className="block group">
      <div className="bg-white border border-[#e5e5e2] rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#1D9E75] transition-colors">
              {name}
            </h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">{domain}</p>
          </div>
          {mentionRate !== undefined && (
            <span
              className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full border ${getMentionRateBadgeClass(mentionRate)}`}
            >
              {mentionRate}%
            </span>
          )}
        </div>

        {/* Sector */}
        <p className="text-xs text-gray-500 mb-4 line-clamp-1">{sector}</p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
          <span>{totalRuns} {totalRuns === 1 ? 'analisi' : 'analisi'}</span>
          {lastAnalysis ? (
            <span>{formatDate(lastAnalysis)}</span>
          ) : (
            <span className="italic">Mai analizzato</span>
          )}
        </div>
      </div>
    </Link>
  );
}
