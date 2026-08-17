import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DB_PATH = process.env.LEILOES_DB_PATH || './data/leiloes.db';

export const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');  // better concurrent read perf
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });