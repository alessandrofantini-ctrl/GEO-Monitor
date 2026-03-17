import { NextRequest, NextResponse } from 'next/server';
import { db, queries, categories } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db
      .select()
      .from(queries)
      .where(eq(queries.brandId, id))
      .orderBy(queries.createdAt);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch queries' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Accepts either a single query or a batch of queries with categories
    if (Array.isArray(body.queries)) {
      // Batch insert with category creation
      const categoryMap = new Map<string, string>();

      // Create categories first
      if (Array.isArray(body.categories)) {
        for (const cat of body.categories as { name: string; color: string }[]) {
          const [created] = await db
            .insert(categories)
            .values({ brandId: id, name: cat.name, color: cat.color })
            .returning();
          categoryMap.set(cat.name, created.id);
        }
      }

      const toInsert = (body.queries as { text: string; category: string; isManual?: boolean }[]).map(
        (q) => ({
          brandId: id,
          text: q.text,
          categoryId: categoryMap.get(q.category) ?? null,
          isManual: q.isManual ?? false,
        })
      );

      const inserted = await db.insert(queries).values(toInsert).returning();
      return NextResponse.json(inserted, { status: 201 });
    }

    // Single query
    const { text, categoryId, isManual } = body;
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

    const [query] = await db
      .insert(queries)
      .values({ brandId: id, text, categoryId, isManual: isManual ?? true })
      .returning();

    return NextResponse.json(query, { status: 201 });
  } catch (err) {
    console.error('[queries POST] error:', err);
    return NextResponse.json({ error: 'Failed to create query' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brandId } = await params;
    const body = await req.json();
    const { queryId, active, text } = body;

    const updates: Partial<typeof queries.$inferInsert> = {};
    if (active !== undefined) updates.active = active;
    if (text !== undefined) updates.text = text;

    const [updated] = await db
      .update(queries)
      .set(updates)
      .where(and(eq(queries.id, queryId), eq(queries.brandId, brandId)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update query' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brandId } = await params;
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('queryId');
    if (!queryId) return NextResponse.json({ error: 'queryId required' }, { status: 400 });

    await db
      .delete(queries)
      .where(and(eq(queries.id, queryId), eq(queries.brandId, brandId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete query' }, { status: 500 });
  }
}
