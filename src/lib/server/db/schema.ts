import { pgTable, varchar, timestamp, uuid, text, boolean } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: uuid('id').primaryKey(),
	username: varchar().notNull().unique(),
	email: varchar().notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
	id: uuid('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at').notNull()
});

export const vinumProject = pgTable('vinum_project', {
	id: uuid('id').primaryKey(),
	ownerId: uuid('owner_id')
		.notNull()
		.references(() => user.id),
	name: text('name').notNull()
});

export const vinumDocument = pgTable('vinum_document', {
	id: uuid('id').primaryKey(),
	projectId: uuid('project_id'),
	relativePath: text('relative_path').notNull(),
	body: text('body').notNull()
});

export const vinumProjectAccess = pgTable('vinum_project_access', {
	projectId: uuid('project_id')
		.notNull()
		.references(() => vinumProject.id),
	userId: uuid('user_id')
		.notNull()
		.references(() => user.id),
	allowWrite: boolean('allow_write').notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type VinumDocument = typeof vinumDocument.$inferSelect;

export type DocumentAccess = typeof vinumProjectAccess.$inferSelect;
