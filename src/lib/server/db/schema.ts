import { pgTable, text, boolean, uuid, timestamp, integer, customType } from 'drizzle-orm/pg-core';
import { user } from './auth_schema';

// Binary Data Custom Type for PostgreSQL bytea (Image & Asset storage)
const bytea = customType<{ data: Buffer }>({
	dataType() {
		return 'bytea';
	},
	toDriver(value: Buffer) {
		return value;
	},
	fromDriver(value: unknown) {
		return Buffer.from(value as ArrayBuffer);
	}
});

// Projects Table (Container for files & documents)
export const vinumProject = pgTable('vinum_project', {
	id: uuid('id').primaryKey().defaultRandom(),
	ownerId: uuid('owner_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	entryFilePath: text('entry_file_path').notNull().default('main.vin'),
	publicAccessLevel: text('public_access_level', { enum: ['none', 'read', 'edit'] }).notNull().default('none'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Project Files Table (Stores both text .vin files and binary image assets in Postgres)
export const vinumDocument = pgTable('vinum_document', {
	id: uuid('id').primaryKey().defaultRandom(),
	projectId: uuid('project_id')
		.notNull()
		.references(() => vinumProject.id, { onDelete: 'cascade' }),
	relativePath: text('relative_path').notNull(),
	mimeType: text('mime_type').notNull().default('text/plain'),
	isBinary: boolean('is_binary').notNull().default(false),
	body: text('body').notNull().default(''),
	binaryData: bytea('binary_data'),
	size: integer('size').notNull().default(0),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Direct Project Sharing with Select People
export const vinumProjectAccess = pgTable('vinum_project_access', {
	id: uuid('id').primaryKey().defaultRandom(),
	projectId: uuid('project_id')
		.notNull()
		.references(() => vinumProject.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	allowWrite: boolean('allow_write').notNull().default(false),
	role: text('role', { enum: ['read', 'edit', 'admin'] }).notNull().default('read'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Link-based Sharing Table (Share project via link)
export const vinumShareLink = pgTable('vinum_share_link', {
	id: uuid('id').primaryKey().defaultRandom(),
	projectId: uuid('project_id')
		.notNull()
		.references(() => vinumProject.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	role: text('role', { enum: ['read', 'edit'] }).notNull().default('read'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export * from './auth_schema';

export type VinumProject = typeof vinumProject.$inferSelect;
export type VinumDocument = typeof vinumDocument.$inferSelect;
export type VinumProjectAccess = typeof vinumProjectAccess.$inferSelect;
export type VinumShareLink = typeof vinumShareLink.$inferSelect;

