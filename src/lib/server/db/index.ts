import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import * as path from 'path';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL, { debug: false });

export const db = drizzle(client, { schema });

// Automatically run pending SQL migrations on server startup
if (!building) {
	try {
		console.log('Running database auto-migrations on server startup...');
		await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
		console.log('Automatic database migrations completed successfully!');
	} catch (err) {
		console.error('Auto-migration error on startup:', err);
	}
}
