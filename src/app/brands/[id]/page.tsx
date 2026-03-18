import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, brands, reports, queries, categories, runs } from '@/lib/db';
import { eq, desc, asc } from 'drizzle-orm';
import { calculateMetrics, aggregateCompetitors } from '@/features/llm-analysis/metrics';
import { Navbar } from '@/components/ui/Navbar';
import { MetricCard } from '@/components/ui/MetricCard';
import { BrandDashboardTabs } from './BrandDashboardTabs';

async function getBrandData(id: string) {
  const [brand] = await db.select().from(brands).where(eq(brands.id, id));
  if (!brand) return null;

  const brandReports = await db
    .select()
    .from(reports)
    .where(eq(reports.brandId, id))
    .orderBy(desc(reports.createdAt));

  const brandQueries = await db
    .select({
      id: queries.id,
      text: queries.text,
      active: queries.active,
      isManual: queries.isManual,
      categoryId: queries.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      createdAt: queries.createdAt,
    })
    .from(queries)
    .leftJoin(categories, eq(queries.categoryId, categories.id))
    .where(eq(queries.brandId, id));

  const brandRuns = await db
    .select()
    .from(runs)
    .where(eq(runs.brandId, id))
    .orderBy(desc(runs.createdAt));

  const brandCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.brandId, id))
    .orderBy(asc(categories.createdAt));

  const metrics = calculateMetrics(brandReports);
  const competitors = aggregateCompetitors(brandReports);

  return { brand, reports: brandReports, queries: brandQueries, runs: brandRuns, categories: brandCategories, metrics, competitors };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getBrandData>>;
  try {
    data = await getBrandData(id);
  } catch {
    data = null;
  }

  if (!data) return notFound();

  const { brand, metrics, competitors, reports: brandReports, queries: brandQueries, runs: brandRuns, categories: brandCategories } = data;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
                Dashboard
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-700">{brand.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
            <a
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#1D9E75] hover:underline"
            >
              {brand.url}
            </a>
            <p className="text-sm text-gray-500 mt-1">{brand.sector}</p>
          </div>
          <Link
            href={`/run/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a65] transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Nuova analisi
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Mention Rate"
            value={`${metrics.mentionRate}%`}
            subLabel={metrics.sentiment}
            color={metrics.mentionRate >= 70 ? 'green' : metrics.mentionRate >= 40 ? 'amber' : 'coral'}
          />
          <MetricCard
            label="First Position"
            value={`${metrics.firstPositionRate}%`}
            subLabel="delle menzioni"
            color="purple"
          />
          <MetricCard
            label="Analisi totali"
            value={brandRuns.length}
            subLabel="esecuzioni"
            color="neutral"
          />
          <MetricCard
            label="Competitor"
            value={competitors.length}
            subLabel="scoperti"
            color="coral"
          />
        </div>

        {/* Tabs */}
        <BrandDashboardTabs
          brand={brand}
          brandId={id}
          reports={brandReports}
          queries={brandQueries}
          runs={brandRuns}
          competitors={competitors}
          categories={brandCategories}
        />
      </main>
    </>
  );
}
