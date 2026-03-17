import { notFound } from 'next/navigation';
import { db, brands, queries, categories } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Navbar } from '@/components/ui/Navbar';
import { RunAnalysis } from './RunAnalysis';

async function getBrandWithQueries(brandId: string) {
  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId));
  if (!brand) return null;

  const brandQueries = await db
    .select({
      id: queries.id,
      text: queries.text,
      active: queries.active,
      categoryId: queries.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(queries)
    .leftJoin(categories, eq(queries.categoryId, categories.id))
    .where(eq(queries.brandId, brandId));

  const activeQueries = brandQueries.filter((q) => q.active !== false);
  return { brand, queries: activeQueries };
}

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getBrandWithQueries>> = null;
  try {
    data = await getBrandWithQueries(id);
  } catch {
    // DB not configured in dev
  }

  if (!data) return notFound();

  const { brand, queries: activeQueries } = data;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RunAnalysis brand={brand} initialQueries={activeQueries} />
      </main>
    </>
  );
}
