import { NextRequest, NextResponse } from 'next/server';
import { db, brands } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    return NextResponse.json(brand);
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
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
