import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { postId, action, userId = 'default-user' } = body;

    if (!postId || !action) {
      return NextResponse.json({ error: 'postId and action are required' }, { status: 400 });
    }

    if (action === 'read') {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT OR IGNORE INTO user_interactions (id, user_id, post_id, interaction_type, interacted_at)
        VALUES (?, ?, ?, 'read', datetime('now'))
      `).run(id, userId, postId);
    } else if (action === 'unread') {
      db.prepare(`
        DELETE FROM user_interactions
        WHERE user_id = ? AND post_id = ? AND interaction_type = 'read'
      `).run(userId, postId);
    } else if (action === 'like') {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT OR IGNORE INTO user_interactions (id, user_id, post_id, interaction_type, interacted_at)
        VALUES (?, ?, ?, 'liked', datetime('now'))
      `).run(id, userId, postId);
    } else if (action === 'unlike') {
      db.prepare(`
        DELETE FROM user_interactions
        WHERE user_id = ? AND post_id = ? AND interaction_type = 'liked'
      `).run(userId, postId);
    } else if (action === 'dismiss') {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT OR IGNORE INTO user_interactions (id, user_id, post_id, interaction_type, interacted_at)
        VALUES (?, ?, ?, 'dismissed', datetime('now'))
      `).run(id, userId, postId);
    } else if (action === 'undismiss') {
      db.prepare(`
        DELETE FROM user_interactions
        WHERE user_id = ? AND post_id = ? AND interaction_type = 'dismissed'
      `).run(userId, postId);
    }

    return NextResponse.json({ status: 'success', action, postId });
  } catch (err: any) {
    console.error('Error handling interaction:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
