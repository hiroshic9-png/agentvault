/**
 * AgentVault Memory — Storage Engine
 * 
 * SQLite + FTS5 による永続ストレージ。
 * ローカルファイルに保存。外部サービス不要。
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export class MemoryStore {
  constructor(dbPath) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this._init();
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '',
        source TEXT DEFAULT '',
        importance INTEGER DEFAULT 5,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        access_count INTEGER DEFAULT 0
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content, tags, source,
        content='memories',
        content_rowid='id'
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content, tags, source) 
        VALUES (new.id, new.content, new.tags, new.source);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, tags, source) 
        VALUES ('delete', old.id, old.content, old.tags, old.source);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, tags, source) 
        VALUES ('delete', old.id, old.content, old.tags, old.source);
        INSERT INTO memories_fts(rowid, content, tags, source) 
        VALUES (new.id, new.content, new.tags, new.source);
      END;
    `);
  }

  save(content, tags = '', source = '', importance = 5) {
    const stmt = this.db.prepare(
      'INSERT INTO memories (content, tags, source, importance) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(content, tags, source, importance);
    return result.lastInsertRowid;
  }

  search(query, limit = 10) {
    // FTS5 全文検索
    const stmt = this.db.prepare(`
      SELECT m.id, m.content, m.tags, m.source, m.importance, m.created_at, m.access_count,
             rank
      FROM memories_fts f
      JOIN memories m ON m.id = f.rowid
      WHERE memories_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    try {
      const results = stmt.all(query, limit);
      // アクセスカウント更新
      const updateStmt = this.db.prepare(
        'UPDATE memories SET access_count = access_count + 1 WHERE id = ?'
      );
      for (const r of results) updateStmt.run(r.id);
      return results;
    } catch {
      // FTS構文エラー時はLIKE検索にフォールバック
      const fallback = this.db.prepare(`
        SELECT id, content, tags, source, importance, created_at, access_count
        FROM memories
        WHERE content LIKE ? OR tags LIKE ?
        ORDER BY importance DESC, created_at DESC
        LIMIT ?
      `);
      return fallback.all(`%${query}%`, `%${query}%`, limit);
    }
  }

  listRecent(limit = 20) {
    const stmt = this.db.prepare(`
      SELECT id, content, tags, source, importance, created_at, access_count
      FROM memories
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  listByTag(tag, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT id, content, tags, source, importance, created_at, access_count
      FROM memories
      WHERE tags LIKE ?
      ORDER BY importance DESC, created_at DESC
      LIMIT ?
    `);
    return stmt.all(`%${tag}%`, limit);
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    return stmt.run(id).changes > 0;
  }

  stats() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM memories').get();
    const tags = this.db.prepare(`
      SELECT DISTINCT tags FROM memories WHERE tags != '' LIMIT 50
    `).all();
    const topAccessed = this.db.prepare(`
      SELECT id, substr(content, 1, 80) as preview, access_count 
      FROM memories 
      ORDER BY access_count DESC 
      LIMIT 5
    `).all();
    return {
      total_memories: total.count,
      unique_tags: tags.map(t => t.tags),
      most_accessed: topAccessed,
    };
  }

  close() {
    this.db.close();
  }
}
