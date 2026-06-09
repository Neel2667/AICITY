/**
 * CityDatabase.ts
 * SQLite persistence for AICITY Live city state.
 * Uses better-sqlite3 (sync API — perfect for a Node.js server singleton).
 *
 * Initialises the DB from schema.sql on first run, then serves as
 * the single source of truth for city_meta, construction, districts,
 * landmarks, contributions, mayors, vote_history, and chat_log.
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const DB_PATH     = process.env.DB_PATH ?? path.join(__dirname, '../../aicity.db');

export interface CityMeta {
  dayNumber:  number;
  population: number;
  buildings:  number;
  cityName:   string;
}

export interface DBConstruction {
  id:             number;
  chunkX:         number;
  chunkY:         number;
  label:          string;
  startDay:       number;
  completionDay:  number;
  complete:       boolean;
}

export interface DBDistrict {
  id:         string;
  name:       string;
  mood:       string;
  unlocked:   boolean;
  unlockDay:  number;
}

export class CityDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    this.db.exec(schema);
    console.log(`[DB] Opened: ${DB_PATH}`);
  }

  // ── City meta ──────────────────────────────────────────────────────────────

  public getMeta(): CityMeta {
    const get = (k: string) => (this.db.prepare('SELECT value FROM city_meta WHERE key=?').get(k) as any)?.value;
    return {
      cityName:   get('city_name')   ?? 'AICITY Live',
      dayNumber:  Number(get('day_number')  ?? 1),
      population: Number(get('population')  ?? 4200),
      buildings:  Number(get('buildings')   ?? 81),
    };
  }

  public setMeta(key: string, value: string | number): void {
    this.db.prepare('INSERT OR REPLACE INTO city_meta(key, value) VALUES (?,?)').run(key, String(value));
  }

  public incrementPopulation(amount: number): void {
    const cur = this.getMeta().population;
    this.setMeta('population', cur + amount);
  }

  public advanceDay(newDay: number): void {
    this.setMeta('day_number', newDay);
    this.incrementPopulation(50);
  }

  // ── Districts ──────────────────────────────────────────────────────────────

  public getDistricts(): DBDistrict[] {
    return (this.db.prepare('SELECT * FROM districts').all() as any[]).map(r => ({
      id: r.id, name: r.name, mood: r.mood,
      unlocked: Boolean(r.unlocked), unlockDay: r.unlock_day,
    }));
  }

  public unlockDistrict(id: string): void {
    this.db.prepare('UPDATE districts SET unlocked=1 WHERE id=?').run(id);
    console.log(`[DB] District unlocked: ${id}`);
  }

  // ── Construction ──────────────────────────────────────────────────────────

  public getActiveConstruction(): DBConstruction[] {
    return (this.db.prepare('SELECT * FROM construction WHERE complete=0').all() as any[]).map(r => ({
      id: r.id, chunkX: r.chunk_x, chunkY: r.chunk_y,
      label: r.label, startDay: r.start_day,
      completionDay: r.completion_day, complete: false,
    }));
  }

  public getAllConstruction(): DBConstruction[] {
    return (this.db.prepare('SELECT * FROM construction ORDER BY id DESC LIMIT 50').all() as any[]).map(r => ({
      id: r.id, chunkX: r.chunk_x, chunkY: r.chunk_y,
      label: r.label, startDay: r.start_day,
      completionDay: r.completion_day, complete: Boolean(r.complete),
    }));
  }

  public addConstruction(chunkX: number, chunkY: number, label: string, startDay: number, completionDay: number): number {
    const res = this.db.prepare(
      'INSERT INTO construction(chunk_x,chunk_y,label,start_day,completion_day) VALUES (?,?,?,?,?)'
    ).run(chunkX, chunkY, label, startDay, completionDay);
    return Number(res.lastInsertRowid);
  }

  public completeConstruction(id: number): void {
    this.db.prepare('UPDATE construction SET complete=1 WHERE id=?').run(id);
    const cur = this.getMeta().buildings;
    this.setMeta('buildings', cur + 1);
  }

  // ── Contributions ─────────────────────────────────────────────────────────

  public addContribution(channelId: string, authorName: string, action: string, target: string, dayNumber: number): void {
    this.db.prepare(
      'INSERT INTO viewer_contributions(channel_id,author_name,action,target,day_number) VALUES (?,?,?,?,?)'
    ).run(channelId, authorName, action, target, dayNumber);
  }

  public getRecentContributions(limit = 10): any[] {
    return this.db.prepare(
      'SELECT * FROM viewer_contributions ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as any[];
  }

  // ── Mayors ────────────────────────────────────────────────────────────────

  public addMayor(channelId: string, authorName: string, dayNumber: number): void {
    this.db.prepare(
      'INSERT INTO mayors(channel_id,author_name,day_number) VALUES (?,?,?)'
    ).run(channelId, authorName, dayNumber);
    console.log(`[DB] Mayor recorded: ${authorName}`);
  }

  public getMayorHistory(limit = 10): any[] {
    return this.db.prepare(
      'SELECT * FROM mayors ORDER BY elected_at DESC LIMIT ?'
    ).all(limit) as any[];
  }

  // ── Votes ─────────────────────────────────────────────────────────────────

  public addVoteResult(pollId: string, winner: string, totalVotes: number): void {
    this.db.prepare(
      'INSERT INTO vote_history(poll_id,winner,total_votes) VALUES (?,?,?)'
    ).run(pollId, winner, totalVotes);
  }

  public getVoteHistory(limit = 20): any[] {
    return this.db.prepare(
      'SELECT * FROM vote_history ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as any[];
  }

  // ── Chat log ──────────────────────────────────────────────────────────────

  public logChat(msg: {
    id: string; channelId: string; authorName: string;
    text: string; isSuperChat: boolean; amount?: number; publishedAt: string;
  }): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO chat_log(message_id,channel_id,author_name,text,is_superchat,amount,published_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(msg.id, msg.channelId, msg.authorName, msg.text,
           msg.isSuperChat ? 1 : 0, msg.amount ?? null, msg.publishedAt);
  }

  public pruneOldChat(): void {
    this.db.prepare(
      "DELETE FROM chat_log WHERE created_at < datetime('now', '-24 hours')"
    ).run();
  }

  public getRecentChat(limit = 50): any[] {
    return this.db.prepare(
      'SELECT * FROM chat_log ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as any[];
  }

  // ── Landmarks ─────────────────────────────────────────────────────────────

  public nameLandmark(chunkX: number, chunkY: number, name: string, namedBy: string): boolean {
    const res = this.db.prepare(
      "UPDATE landmarks SET name=?, named_by=?, named_at=datetime('now') WHERE chunk_x=? AND chunk_y=?"
    ).run(name, namedBy, chunkX, chunkY);
    return (res.changes ?? 0) > 0;
  }

  public getLandmarks(): any[] {
    return this.db.prepare('SELECT * FROM landmarks').all() as any[];
  }

  // ── Full state snapshot (for admin panel / !where) ────────────────────────

  public getFullSnapshot() {
    const meta         = this.getMeta();
    const districts    = this.getDistricts();
    const construction = this.getActiveConstruction();
    const contributions = this.getRecentContributions(5);
    const mayors       = this.getMayorHistory(3);
    const landmarks    = this.getLandmarks();
    return { meta, districts, construction, contributions, mayors, landmarks };
  }

  public close(): void {
    this.db.close();
  }
}

// Singleton
export const cityDB = new CityDatabase();
