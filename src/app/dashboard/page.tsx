import Link from 'next/link';
import { db, brands, reports, runs } from '@/lib/db';
import { eq, desc, count } from 'drizzle-orm';
import { BrandCard } from '@/components/ui/BrandCard';
import { Navbar } from '@/components/ui/Navbar';
import { calculateMetrics } from '@/features/llm-analysis/metrics';

async function getBrandsWithStats() {
  const allBrands = await db.select().from(brands).orderBy(desc(brands.createdAt));

  const brandsWithStats = await Promise.all(
    allBrands.map(async (brand) => {
      const brandReports = await db
        .select()
        .from(reports)
        .where(eq(reports.brandId, brand.id));

      const brandRuns = await db
        .select()
        .from(runs)
        .where(eq(runs.brandId, brand.id))
        .orderBy(desc(runs.createdAt))
        .limit(1);

      const metrics = calculateMetrics(brandReports);
      return {
        ...brand,
        mentionRate: brandReports.length > 0 ? metrics.mentionRate : undefined,
        lastAnalysis: brandRuns[0]?.completedAt ?? null,
        totalRuns: brandRuns.length,
      };
    })
  );

  return brandsWithStats;
}

export default async function DashboardPage() {
  let brandsWithStats: Awaited<ReturnType<typeof getBrandsWithStats>> = [];

  try {
    brandsWithStats = await getBrandsWithStats();
  } catch {
    // WHY: se il DB non è configurato (local dev senza DATABASE_URL), mostriamo empty state
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brand monitorati</h1>
            <p className="text-sm text-gray-500 mt-1">
              {brandsWithStats.length} brand attivi
            </p>
          </div>
          <Link
            href="/brands/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Aggiungi brand
          </Link>
        </div>

        {/* Brand Grid */}
        {brandsWithStats.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Nessun brand ancora</h2>
            <p className="text-gray-500 text-sm mb-6">
              Aggiungi il tuo primo brand per iniziare a monitorare la visibilità sugli LLM.
            </p>
            <Link
              href="/brands/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Aggiungi primo brand
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {brandsWithStats.map((brand) => (
              <BrandCard
                key={brand.id}
                id={brand.id}
                name={brand.name}
                url={brand.url}
                sector={brand.sector}
                mentionRate={brand.mentionRate}
                lastAnalysis={brand.lastAnalysis}
                totalRuns={brand.totalRuns}
              />
            ))}
            {/* Add brand card */}
            <Link
              href="/brands/new"
              className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-colors group min-h-[140px]"
            >
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center group-hover:bg-[#1D9E75]/5 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium">Aggiungi brand</span>
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
