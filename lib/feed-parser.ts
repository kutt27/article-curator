import { XMLParser } from 'fast-xml-parser';
import crypto from 'node:crypto';
import { getDb } from './db';
import { extractArticleMetadata, fetchFullArticleBody } from './article-cleaner';
import { generateEmbedding } from './embeddings';

export interface IngestedPost {
  id: string;
  sourceId: string;
  title: string;
  canonicalUrl: string;
  author: string;
  contentRaw: string;
  contentCleaned: string;
  summary: string;
  readingTimeMinutes: number;
  tags: string[];
  publishedAt: string;
  embedding: number[];
}

export function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url.trim().toLowerCase()).digest('hex').substring(0, 32);
}

export async function parseAndIngestFeed(
  sourceId: string,
  feedUrl: string,
  siteName: string,
  fetchFullPages: boolean = false
): Promise<{ added: number; updated: number; errors: number }> {
  const db = getDb();
  let added = 0;
  let updated = 0;
  let errors = 0;

  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'CuratePulseBot/1.0 (+https://curatepulse.app/bot)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn(`Feed fetch returned status ${response.status} for ${feedUrl}`);
      return { added, updated, errors: 1 };
    }

    const xmlData = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: false,
    });

    const parsed = parser.parse(xmlData);
    let items: any[] = [];

    // Check RSS 2.0 / RDF structure
    if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
      items = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];
    } else if (parsed['rdf:RDF'] && parsed['rdf:RDF'].item) {
      items = Array.isArray(parsed['rdf:RDF'].item)
        ? parsed['rdf:RDF'].item
        : [parsed['rdf:RDF'].item];
    } else if (parsed.feed && parsed.feed.entry) {
      // Atom feed structure
      items = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];
    }

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO posts (
        id, source_id, title, canonical_url, author, content_raw, content_cleaned,
        summary, reading_time_minutes, tags, published_at, embedding, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const item of items) {
      try {
        // Extract title
        let title = '';
        if (typeof item.title === 'string') {
          title = item.title;
        } else if (item.title && item.title['#text']) {
          title = item.title['#text'];
        }
        title = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        if (!title) continue;

        // Extract canonical URL
        let canonicalUrl = '';
        if (typeof item.link === 'string') {
          canonicalUrl = item.link;
        } else if (item.link && item.link['@_href']) {
          canonicalUrl = item.link['@_href'];
        } else if (Array.isArray(item.link)) {
          const alternate = item.link.find((l: any) => l['@_rel'] === 'alternate' || !l['@_rel']);
          canonicalUrl = alternate ? alternate['@_href'] : item.link[0]['@_href'] || '';
        } else if (item.guid) {
          const guidStr = typeof item.guid === 'string' ? item.guid : item.guid['#text'] || '';
          if (guidStr.startsWith('http')) canonicalUrl = guidStr;
        }

        canonicalUrl = canonicalUrl.trim();
        if (!canonicalUrl) continue;

        const postId = hashUrl(canonicalUrl);

        // Check if article already exists
        const existing = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
        if (existing) {
          continue; // Already ingested
        }

        // Extract author
        let author = siteName;
        if (item.author) {
          if (typeof item.author === 'string') author = item.author;
          else if (item.author.name) author = item.author.name;
        } else if (item['dc:creator']) {
          author = item['dc:creator'];
        }

        // Extract publication date
        let publishedAt = new Date().toISOString();
        const dateCandidate = item.pubDate || item.published || item.updated || item['dc:date'];
        if (dateCandidate) {
          const d = new Date(dateCandidate);
          if (!isNaN(d.getTime())) {
            publishedAt = d.toISOString();
          }
        }

        // Extract content / description
        let rawContent = item['content:encoded'] || item.content || item.description || item.summary || '';
        if (typeof rawContent === 'object' && rawContent['#text']) {
          rawContent = rawContent['#text'];
        }

        // If excerpt is very short and fetchFullPages is requested, try fetching body
        if (fetchFullPages && rawContent.length < 250) {
          const fullBody = await fetchFullArticleBody(canonicalUrl);
          if (fullBody && fullBody.length > rawContent.length) {
            rawContent = fullBody;
          }
        }

        // Clean content, extract summary, reading time, and tags
        const rawSummary = typeof item.description === 'string' ? item.description : '';
        const metadata = extractArticleMetadata(rawContent, rawSummary);

        // Generate vector embedding for (title + summary)
        const textToEmbed = `${title}. ${metadata.summary}`;
        const embedding = await generateEmbedding(textToEmbed);

        insertStmt.run(
          postId,
          sourceId,
          title,
          canonicalUrl,
          author,
          rawContent.substring(0, 100000), // retain raw temporarily
          metadata.cleanContent,
          metadata.summary,
          metadata.readingTimeMinutes,
          JSON.stringify(metadata.tags),
          publishedAt,
          JSON.stringify(embedding)
        );

        added++;
      } catch (itemErr) {
        console.warn(`Error processing item in feed ${feedUrl}:`, itemErr);
        errors++;
      }
    }

    // Update source last_polled_at
    db.prepare("UPDATE sources SET last_polled_at = datetime('now') WHERE id = ?").run(sourceId);

  } catch (feedErr) {
    console.warn(`Error polling feed ${feedUrl}:`, feedErr);
    errors++;
  }

  return { added, updated, errors };
}
