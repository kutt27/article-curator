import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { interest_prompt, api_key } = body;

    if (!interest_prompt || typeof interest_prompt !== 'string') {
      return NextResponse.json(
        { error: 'interest_prompt is required and must be a string' },
        { status: 400 }
      );
    }

    const embedding = await generateEmbedding(interest_prompt, api_key);
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_profiles (id, interest_prompt, interest_embedding, updated_at)
      VALUES ('default-user', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        interest_prompt = excluded.interest_prompt,
        interest_embedding = excluded.interest_embedding,
        updated_at = excluded.updated_at
    `).run(
      interest_prompt.trim(),
      JSON.stringify(embedding),
      nowIso
    );

    return NextResponse.json({
      status: 'updated',
      embedding_generated: true,
      timestamp: nowIso,
    });
  } catch (err: any) {
    console.error('Error updating interest lens:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
