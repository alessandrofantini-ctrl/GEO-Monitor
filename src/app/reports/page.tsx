import { db, reports, brands } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { Navbar } from '@/components/ui/Navbar';
import { LLMBadge } from '@/components/ui/LLMBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

async function getAllReports() {
  const allReports = await db
    .select({
      id: reports.id,
      brandId: reports.brandId,
      brandName: brands.name,
      llm: reports.llm,
      queryText: reports.queryText,
      isMentioned: reports.isMentioned,
      isFirst: reports.isFirst,
      competitors: reports.competitors,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .leftJoin(brands, eq(reports.brandId, brands.id))
    .orderBy(desc(reports.createdAt))
    .limit(200);

  return allReports;
}

export default async function ReportsPage() {
  let allReports: Awaited<ReturnType<typeof getAllReports>> = [];

  try {
    allReports = await getAllReports();
  } catch {
    // DB not configured
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Storico globale</h1>
          <p className="text-sm text-gray-500 mt-1">
            {allReports.length} report totali su tutti i brand
          </p>
        </div>

        <div className="bg-white border border-[#e5e5e2] rounded-xl overflow-hidden">
          {allReports.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">Nessun report ancora. Avvia una prima analisi.</p>
              <Link
                href="/dashboard"
                className="mt-3 inline-block text-sm text-[#1D9E75] hover:underline"
              >
                Vai alla dashboard →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 font-medium">Brand</th>
                    <th className="px-4 py-3 font-medium">LLM</th>
                    <th className="px-4 py-3 font-medium">Query</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium">Competitor</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {allReports.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        {r.brandId ? (
                          <Link
                            href={`/brands/${r.brandId}`}
                            className="text-[#1D9E75] hover:underline font-medium"
                          >
                            {r.brandName ?? '-'}
                          </Link>
                        ) : (
                          <span className="text-gray-500">{r.brandName ?? '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <LLMBadge llm={r.llm} size="sm" />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="line-clamp-1 text-gray-700">{r.queryText}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge isMentioned={r.isMentioned} isFirst={r.isFirst} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {(r.competitors as string[] | null)?.slice(0, 2).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {r.createdAt ? formatDate(r.createdAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
