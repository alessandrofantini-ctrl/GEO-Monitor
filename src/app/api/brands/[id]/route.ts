import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db, brands, categories, queries } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    const brandCategories = await db.select().from(categories).where(eq(categories.brandId, id));
    const brandQueries = await db.select().from(queries).where(eq(queries.brandId, id)).orderBy(queries.createdAt);

    return NextResponse.json({ ...brand, categories: brandCategories, queries: brandQueries });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const [updated] = await db
      .update(brands)
      .set(body)
      .where(eq(brands.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(brands).where(eq(brands.id, id));
    revalidatePath('/dashboard');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
