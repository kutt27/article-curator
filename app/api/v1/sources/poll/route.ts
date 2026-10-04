import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parseAndIngestFeed } from '@/lib/feed-parser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json().catch(() => ({}));
    const { sourceId, fetchFullPages } = body;

    let sourcesToPoll: any[] = [];
    if (sourceId) {
      const src = db.prepare('SELECT id, site_name, feed_url FROM sources WHERE id = ? AND is_active = 1').get(sourceId);
      if (src) sourcesToPoll.push(src);
    } else {
      sourcesToPoll = db.prepare('SELECT id, site_name, feed_url FROM sources WHERE is_active = 1').all() as any[];
    }

    let totalAdded = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const src of sourcesToPoll) {
      const result = await parseAndIngestFeed(src.id, src.feed_url, src.site_name, Boolean(fetchFullPages));
      totalAdded += result.added;
      totalUpdated += result.updated;
      totalErrors += result.errors;
    }

    return NextResponse.json({
      polled: sourcesToPoll.length,
      added: totalAdded,
      updated: totalUpdated,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error polling feeds:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
