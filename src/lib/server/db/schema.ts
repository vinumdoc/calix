import { pgTable, text, boolean, uuid } from 'drizzle-orm/pg-core';
import { session, user } from './auth_schema';

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

export * from './auth_schema';

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type VinumDocument = typeof vinumDocument.$inferSelect;

export type DocumentAccess = typeof vinumProjectAccess.$inferSelect;
