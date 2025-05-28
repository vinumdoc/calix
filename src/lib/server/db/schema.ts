import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const vinumDocument = sqliteTable('document', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	title: text('title').notNull(),
	body: text('body').notNull()
});

export const documentAccess = sqliteTable('document_access', {
	documentId: text('document_id')
		.notNull()
		.references(() => vinumDocument.id),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	canWrite: integer('can_write').notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type VinumDocument = typeof vinumDocument.$inferSelect;

export type DocumentAccess = typeof documentAccess.$inferSelect;
