import { NextRequest, NextResponse } from 'next/server';
import { db, brands } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const all = await db.select().from(brands).orderBy(brands.createdAt);
    return NextResponse.json(all);
  } catch (err) {
    console.error('[brands GET] error:', err);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, sector, description, aliases, country, language } = body;

    if (!name || !url || !sector) {
      return NextResponse.json({ error: 'name, url, sector are required' }, { status: 400 });
    }

    const [brand] = await db
      .insert(brands)
      .values({ name, url, sector, description, aliases: aliases ?? [], country, language })
      .returning();

    return NextResponse.json(brand, { status: 201 });
  } catch (err) {
    console.error('[brands POST] error:', err);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await db.delete(brands).where(eq(brands.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[brands DELETE] error:', err);
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
