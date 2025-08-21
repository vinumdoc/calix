import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
	if (!db) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		const client = new Database(env.DATABASE_URL);
		db = drizzle(client);
	}
	return db;
}

// For backward compatibility
export { getDb as db };
