import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../lib/db';
import { hashUrl, parseAndIngestFeed } from '../lib/feed-parser';

interface ConsensusSource {
  author: string;
  siteUrl: string;
  feedUrl: string;
}

async function main() {
  console.log('🚀 Starting import of developer RSS feeds from theconsensus.dev...');

  const jsonPath = path.join(process.cwd(), 'scratch', 'consensus_sources.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('scratch/consensus_sources.json not found!');
    process.exit(1);
  }

  const sources: ConsensusSource[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📋 Found ${sources.length} sources to import.`);

  const db = getDb();

  const insertSource = db.prepare(`
    INSERT INTO sources (id, site_name, feed_url, site_url, is_active, last_polled_at, created_at)
    VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    ON CONFLICT(feed_url) DO UPDATE SET
      site_name = excluded.site_name,
      site_url = excluded.site_url,
      is_active = 1
  `);

  const sourceRecords: { id: string; name: string; feedUrl: string }[] = [];

  for (const src of sources) {
    const id = 'src-' + hashUrl(src.feedUrl).substring(0, 10);
    insertSource.run(id, src.author, src.feedUrl, src.siteUrl);
    sourceRecords.push({ id, name: src.author, feedUrl: src.feedUrl });
  }

  console.log(`✅ Successfully registered ${sourceRecords.length} sources in database.`);

  // Ingest articles concurrently in batches of 10
  console.log('📥 Ingesting live articles from feeds (concurrency: 12)...');
  const CONCURRENCY = 12;
  let totalArticlesAdded = 0;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < sourceRecords.length; i += CONCURRENCY) {
    const batch = sourceRecords.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (src) => {
        try {
          const res = await parseAndIngestFeed(src.id, src.feedUrl, src.name, false);
          return { name: src.name, ...res };
        } catch (err: any) {
          return { name: src.name, added: 0, errors: 1, error: err.message };
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalArticlesAdded += r.value.added;
        if (r.value.errors > 0 && r.value.added === 0) {
          failCount++;
        } else {
          successCount++;
        }
      } else {
        failCount++;
      }
    }

    const processed = Math.min(i + CONCURRENCY, sourceRecords.length);
    process.stdout.write(`\r[${processed}/${sourceRecords.length}] Processed... Added: ${totalArticlesAdded} articles (OK: ${successCount}, Skipped/Err: ${failCount})`);
  }

  console.log('\n\n🎉 Ingestion complete!');
  console.log(`- Total sources in database: ${db.prepare('SELECT count(*) as c FROM sources').get().c}`);
  console.log(`- Total articles in database: ${db.prepare('SELECT count(*) as c FROM posts').get().c}`);
}

main().catch((err) => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
