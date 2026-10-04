import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'curatepulse.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export interface StatementAdapter {
  all(...params: any[]): any[];
  get(...params: any[]): any;
  run(...params: any[]): { changes?: number; lastInsertRowid?: number | bigint };
}

export interface DatabaseAdapter {
  exec(sql: string): void;
  prepare(sql: string): StatementAdapter;
}

declare const __non_webpack_require__: any;

function getNativeRequire(): any {
  if (typeof __non_webpack_require__ !== 'undefined') {
    return __non_webpack_require__;
  }
  return require;
}

let dbInstance: DatabaseAdapter | null = null;

export function getDb(): DatabaseAdapter {
  if (dbInstance) return dbInstance;

  const nativeReq = getNativeRequire();

  // Try bun:sqlite first if in Bun
  if (Boolean((process.versions as any)?.bun)) {
    try {
      const bunSqlite = nativeReq('bun:sqlite');
      if (bunSqlite) {
        const Database = bunSqlite.Database || bunSqlite.default;
        const rawDb = new Database(DB_PATH, { create: true });
        rawDb.exec('PRAGMA journal_mode = WAL;');
        rawDb.exec('PRAGMA foreign_keys = ON;');

        dbInstance = {
          exec(sql: string) {
            rawDb.exec(sql);
          },
          prepare(sql: string): StatementAdapter {
            const stmt = rawDb.prepare(sql);
            return {
              all(...params: any[]) {
                return stmt.all(...params);
              },
              get(...params: any[]) {
                return stmt.get(...params);
              },
              run(...params: any[]) {
                return stmt.run(...params);
              },
            };
          },
        };
      }
    } catch {}
  }

  // Try Node.js node:sqlite
  if (!dbInstance) {
    try {
      const nodeSqlite = nativeReq('node:sqlite');
      if (nodeSqlite && nodeSqlite.DatabaseSync) {
        const { DatabaseSync } = nodeSqlite;
        const rawDb = new DatabaseSync(DB_PATH);
        rawDb.exec('PRAGMA journal_mode = WAL;');
        rawDb.exec('PRAGMA foreign_keys = ON;');

        dbInstance = {
          exec(sql: string) {
            rawDb.exec(sql);
          },
          prepare(sql: string): StatementAdapter {
            const stmt = rawDb.prepare(sql);
            return {
              all(...params: any[]) {
                return stmt.all(...params);
              },
              get(...params: any[]) {
                return stmt.get(...params);
              },
              run(...params: any[]) {
                return stmt.run(...params);
              },
            };
          },
        };
      }
    } catch (err) {
      console.error('Failed to load node:sqlite:', err);
    }
  }

  if (!dbInstance) {
    throw new Error('SQLite runtime not found in environment');
  }

  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db: DatabaseAdapter) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      site_name TEXT NOT NULL,
      feed_url TEXT UNIQUE NOT NULL,
      site_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_polled_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      interest_prompt TEXT NOT NULL,
      interest_embedding TEXT,
      decay_weight REAL DEFAULT 0.35,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      source_id TEXT REFERENCES sources(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      canonical_url TEXT UNIQUE NOT NULL,
      author TEXT,
      content_raw TEXT,
      content_cleaned TEXT,
      summary TEXT,
      reading_time_minutes INTEGER DEFAULT 5,
      tags TEXT,
      published_at TEXT NOT NULL,
      embedding TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_posts_source_id ON posts(source_id);
    CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
    CREATE INDEX IF NOT EXISTS idx_posts_canonical_url ON posts(canonical_url);

    CREATE TABLE IF NOT EXISTS user_interactions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES user_profiles(id),
      post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
      interaction_type TEXT NOT NULL,
      interacted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, post_id, interaction_type)
    );

    CREATE INDEX IF NOT EXISTS idx_interactions_user_post ON user_interactions(user_id, post_id);
  `);

  // Ensure default user profile exists
  const existingUser = db.prepare('SELECT id FROM user_profiles WHERE id = ?').get('default-user');
  if (!existingUser) {
    db.prepare(`
      INSERT INTO user_profiles (id, interest_prompt, decay_weight, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(
      'default-user',
      'Low-latency backend engineering, Go concurrency, cache coherence, distributed systems, and database internals',
      0.35
    );
  }
}
