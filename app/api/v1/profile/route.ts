import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';
import { seedInitialData } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    await seedInitialData();

    const profile = db.prepare(`
      SELECT id, interest_prompt, decay_weight, updated_at
      FROM user_profiles
      WHERE id = 'default-user'
    `).get() as any;

    return NextResponse.json({
      profile: profile || {
        id: 'default-user',
        interest_prompt: 'Low-latency backend engineering, Go concurrency, cache coherence, distributed systems, and database internals',
        decay_weight: 0.35,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { decay_weight } = body;

    if (decay_weight !== undefined) {
      db.prepare(`
        UPDATE user_profiles
        SET decay_weight = ?, updated_at = datetime('now')
        WHERE id = 'default-user'
      `).run(Number(decay_weight));
    }

    return NextResponse.json({ status: 'updated' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
