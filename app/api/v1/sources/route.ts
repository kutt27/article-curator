import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '@/lib/db';
import { discoverFeed } from '@/lib/feed-discovery';
import { parseAndIngestFeed } from '@/lib/feed-parser';
import { seedInitialData } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    await seedInitialData();

    const sources = db.prepare(`
      SELECT 
        s.id, 
        s.site_name, 
        s.feed_url, 
        s.site_url, 
        s.is_active, 
        s.last_polled_at, 
        s.created_at,
        COUNT(p.id) as post_count
      FROM sources s
      LEFT JOIN posts p ON s.id = p.source_id
      GROUP BY s.id
      ORDER BY s.site_name ASC
    `).all();

    return NextResponse.json({ sources });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    // Auto-discover RSS / Atom feed
    const discovered = await discoverFeed(url);
    const sourceId = 'src-' + crypto.randomUUID().substring(0, 8);

    const finalSiteName = discovered.siteName?.trim() || new URL(discovered.siteUrl).hostname.replace(/^www\./, '');

    db.prepare(`
      INSERT INTO sources (id, site_name, feed_url, site_url, is_active, last_polled_at, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(feed_url) DO UPDATE SET
        site_name = CASE WHEN excluded.site_name != '' THEN excluded.site_name ELSE sources.site_name END,
        site_url = excluded.site_url,
        is_active = 1
    `).run(
      sourceId,
      finalSiteName,
      discovered.feedUrl,
      discovered.siteUrl
    );

    // Get final stored source record
    const stored = db.prepare('SELECT id, site_name, feed_url, site_url FROM sources WHERE feed_url = ?').get(discovered.feedUrl) as any;

    // Trigger initial ingest in background
    parseAndIngestFeed(stored.id, stored.feed_url, stored.site_name).catch(console.error);

    return NextResponse.json({
      id: stored.id,
      site_name: stored.site_name,
      feed_url: stored.feed_url,
      site_url: stored.site_url,
      status: 'active',
      discovered_type: discovered.feedType,
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error adding source:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }

    db.prepare('DELETE FROM sources WHERE id = ?').run(id);
    return NextResponse.json({ status: 'deleted', id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
