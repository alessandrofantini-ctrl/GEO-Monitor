import { NextRequest, NextResponse } from 'next/server';
import { db, runs, queries, categories } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db
      .select()
      .from(runs)
      .where(eq(runs.brandId, id))
      .orderBy(desc(runs.createdAt));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brandId } = await params;
    const body = await req.json();
    const { llms = ['chatgpt'] } = body;

    const [run] = await db
      .insert(runs)
      .values({ brandId, llms, status: 'pending' })
      .returning();

    // Fetch active queries with their categories
    const activeQueries = await db
      .select({
        id: queries.id,
        text: queries.text,
        categoryId: queries.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(queries)
      .leftJoin(categories, eq(queries.categoryId, categories.id))
      .where(eq(queries.brandId, brandId));

    return NextResponse.json({ run, queries: activeQueries }, { status: 201 });
  } catch (err) {
    console.error('[runs POST] error:', err);
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 });
  }
}
