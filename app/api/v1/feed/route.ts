import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedInitialData } from '@/lib/seed';
import { calculateHybridScore } from '@/lib/scoring';
import { generateEmbedding } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    await seedInitialData();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const timeframe = searchParams.get('timeframe') || '30d';
    const filter = searchParams.get('filter') || 'all'; // 'all', 'unread', 'liked', 'dismissed'
    const sourceId = searchParams.get('source_id') || '';
    const searchQuery = (searchParams.get('query') || '').trim().toLowerCase();
    const customLambda = searchParams.get('lambda') !== null ? parseFloat(searchParams.get('lambda')!) : null;

    // 1. Get user profile and embedding
    const userProfile = db.prepare(`
      SELECT id, interest_prompt, interest_embedding, decay_weight
      FROM user_profiles
      WHERE id = 'default-user'
    `).get() as any;

    let userEmbedding: number[] | null = null;
    if (userProfile?.interest_embedding) {
      try {
        userEmbedding = JSON.parse(userProfile.interest_embedding);
      } catch {}
    }

    if (!userEmbedding && userProfile?.interest_prompt) {
      userEmbedding = await generateEmbedding(userProfile.interest_prompt);
      db.prepare('UPDATE user_profiles SET interest_embedding = ? WHERE id = ?').run(
        JSON.stringify(userEmbedding),
        userProfile.id
      );
    }

    const lambda = customLambda !== null ? customLambda : (userProfile?.decay_weight ?? 0.35);

    // 2. Compute timeframe cutoff
    let daysCutoff = 30;
    if (timeframe === '24h' || timeframe === '1d') daysCutoff = 1;
    else if (timeframe === '7d') daysCutoff = 7;
    else if (timeframe === '14d') daysCutoff = 14;
    else if (timeframe === '90d') daysCutoff = 90;

    const cutoffIso = new Date(Date.now() - daysCutoff * 24 * 60 * 60 * 1000).toISOString();

    // 3. Query posts with source metadata
    let querySql = `
      SELECT 
        p.id,
        p.source_id,
        p.title,
        p.canonical_url,
        p.author,
        p.summary,
        p.content_cleaned,
        p.reading_time_minutes,
        p.tags,
        p.published_at,
        p.embedding,
        s.site_name,
        s.site_url
      FROM posts p
      JOIN sources s ON p.source_id = s.id
      WHERE p.published_at >= ?
    `;

    const params: any[] = [cutoffIso];

    if (sourceId) {
      querySql += ` AND p.source_id = ?`;
      params.push(sourceId);
    }

    const rows = db.prepare(querySql).all(...params) as any[];

    // 4. Query user interactions
    const interactions = db.prepare(`
      SELECT post_id, interaction_type
      FROM user_interactions
      WHERE user_id = 'default-user'
    `).all() as any[];

    const readSet = new Set<string>();
    const likedSet = new Set<string>();
    const dismissedSet = new Set<string>();

    for (const inter of interactions) {
      if (inter.interaction_type === 'read') readSet.add(inter.post_id);
      if (inter.interaction_type === 'liked') likedSet.add(inter.post_id);
      if (inter.interaction_type === 'dismissed') dismissedSet.add(inter.post_id);
    }

    // 5. Compute scores and assemble items
    const scoredItems = [];
    const now = Date.now();

    for (const post of rows) {
      const isRead = readSet.has(post.id);
      const isLiked = likedSet.has(post.id);
      const isDismissed = dismissedSet.has(post.id);

      // Filtering criteria
      if (filter === 'unread' && isRead) continue;
      if (filter === 'liked' && !isLiked) continue;
      if (filter === 'dismissed') {
        if (!isDismissed) continue;
      } else {
        // By default, drop dismissed articles from regular stream
        if (isDismissed) continue;
      }

      // Search query filter
      if (searchQuery) {
        const titleMatch = post.title.toLowerCase().includes(searchQuery);
        const summaryMatch = (post.summary || '').toLowerCase().includes(searchQuery);
        const sourceMatch = (post.site_name || '').toLowerCase().includes(searchQuery);
        const tagsMatch = (post.tags || '').toLowerCase().includes(searchQuery);
        if (!titleMatch && !summaryMatch && !sourceMatch && !tagsMatch) {
          continue;
        }
      }

      let postEmbedding: number[] | null = null;
      if (post.embedding) {
        try {
          postEmbedding = JSON.parse(post.embedding);
        } catch {}
      }

      const scoreInfo = calculateHybridScore(
        userEmbedding,
        postEmbedding,
        post.published_at,
        lambda,
        now
      );

      // Bookmark / like interaction slight affinity boost
      let finalDecayedScore = scoreInfo.finalScore;
      if (isLiked) {
        finalDecayedScore = Math.min(1.0, finalDecayedScore + 0.08);
      }

      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(post.tags || '[]');
      } catch {
        parsedTags = [];
      }

      scoredItems.push({
        id: post.id,
        title: post.title,
        source: post.site_name,
        source_id: post.source_id,
        canonical_url: post.canonical_url,
        author: post.author,
        published_at: post.published_at,
        relevance_score: scoreInfo.rawRelevance,
        decay_multiplier: scoreInfo.decayMultiplier,
        decayed_score: parseFloat(finalDecayedScore.toFixed(4)),
        age_in_hours: scoreInfo.ageInHours,
        summary: post.summary,
        reading_time_minutes: post.reading_time_minutes || 5,
        tags: parsedTags,
        content_cleaned: post.content_cleaned,
        is_read: isRead,
        is_liked: isLiked,
        is_dismissed: isDismissed,
      });
    }

    // 6. Sort descending by decayed_score (hybrid ranked)
    scoredItems.sort((a, b) => b.decayed_score - a.decayed_score);

    const paginatedItems = scoredItems.slice(0, limit);

    return NextResponse.json({
      items: paginatedItems,
      total_items: scoredItems.length,
      unread_count: scoredItems.filter(i => !i.is_read).length,
      user_profile: {
        interest_prompt: userProfile?.interest_prompt || '',
        decay_weight: lambda,
      }
    });

  } catch (err: any) {
    console.error('Error fetching feed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
