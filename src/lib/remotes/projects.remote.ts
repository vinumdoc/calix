import { command, getRequestEvent, query } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import * as v from 'valibot';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const listProjects = query(async () => {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user) return [];

	// Fetch projects owned by user or shared with user
	const userProjects = await db
		.select({
			id: table.vinumProject.id,
			name: table.vinumProject.name,
			description: table.vinumProject.description,
			entryFilePath: table.vinumProject.entryFilePath,
			publicAccessLevel: table.vinumProject.publicAccessLevel,
			createdAt: table.vinumProject.createdAt,
			updatedAt: table.vinumProject.updatedAt,
			ownerId: table.vinumProject.ownerId
		})
		.from(table.vinumProject)
		.where(eq(table.vinumProject.ownerId, user.id));

	return userProjects;
});

export const createProject = command(
	v.object({
		name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
		description: v.optional(v.string())
	}),
	async ({ name, description }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const [newProject] = await db
			.insert(table.vinumProject)
			.values({
				ownerId: user.id,
				name,
				description: description || '',
				entryFilePath: 'main.vinum'
			})
			.returning();

		// Create default entry main.vin file
		const defaultCode = `[doc [paragraph Hello World]]`;

		await db.insert(table.vinumDocument).values({
			projectId: newProject.id,
			relativePath: 'main.vinum',
			mimeType: 'text/plain',
			isBinary: false,
			body: defaultCode,
			size: Buffer.byteLength(defaultCode, 'utf-8')
		});

		return newProject;
	}
);

export const getProjectWithFiles = query(v.string(), async (projectId) => {
	const event = getRequestEvent();
	const user = event.locals.user;

	const [project] = await db
		.select()
		.from(table.vinumProject)
		.where(eq(table.vinumProject.id, projectId));

	if (!project) throw error(404, 'Project not found');

	// Access check: owner or public read/edit or collaborator
	const isOwner = user && project.ownerId === user.id;
	if (!isOwner && project.publicAccessLevel === 'none') {
		if (!user) throw error(401, 'Unauthorized');

		const [access] = await db
			.select()
			.from(table.vinumProjectAccess)
			.where(
				and(
					eq(table.vinumProjectAccess.projectId, projectId),
					eq(table.vinumProjectAccess.userId, user.id)
				)
			);

		if (!access) throw error(403, 'Forbidden');
	}

	// Fetch documents (without heavy binary payload for listing)
	const files = await db
		.select({
			id: table.vinumDocument.id,
			relativePath: table.vinumDocument.relativePath,
			mimeType: table.vinumDocument.mimeType,
			isBinary: table.vinumDocument.isBinary,
			body: table.vinumDocument.body,
			size: table.vinumDocument.size,
			updatedAt: table.vinumDocument.updatedAt
		})
		.from(table.vinumDocument)
		.where(eq(table.vinumDocument.projectId, projectId));

	return {
		project,
		files,
		isOwner
	};
});

export const saveFileContent = command(
	v.object({
		projectId: v.string(),
		relativePath: v.string(),
		body: v.string()
	}),
	async ({ projectId, relativePath, body }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		// Check if file exists
		const [existing] = await db
			.select()
			.from(table.vinumDocument)
			.where(
				and(
					eq(table.vinumDocument.projectId, projectId),
					eq(table.vinumDocument.relativePath, relativePath)
				)
			);

		if (existing) {
			await db
				.update(table.vinumDocument)
				.set({
					body,
					size: Buffer.byteLength(body, 'utf-8'),
					updatedAt: new Date()
				})
				.where(eq(table.vinumDocument.id, existing.id));
		} else {
			await db.insert(table.vinumDocument).values({
				projectId,
				relativePath,
				mimeType: 'text/plain',
				isBinary: false,
				body,
				size: Buffer.byteLength(body, 'utf-8')
			});
		}

		return { success: true };
	}
);

export const deleteFile = command(
	v.object({
		projectId: v.string(),
		relativePath: v.string()
	}),
	async ({ projectId, relativePath }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		await db
			.delete(table.vinumDocument)
			.where(
				and(
					eq(table.vinumDocument.projectId, projectId),
					eq(table.vinumDocument.relativePath, relativePath)
				)
			);

		return { success: true };
	}
);

export const renameFile = command(
    v.object({
        projectId: v.string(),
        oldPath: v.string(),
        newPath: v.string()
    }),
    async ({ projectId, oldPath, newPath }) => {
        const event = getRequestEvent();
        const user = event.locals.user;
        if (!user) throw error(401, 'Unauthorized');

        await db
            .update(table.vinumDocument)
            .set({ relativePath: newPath })
            .where(
                and(
                    eq(table.vinumDocument.projectId, projectId),
                    eq(table.vinumDocument.relativePath, oldPath)
                )
            );

        return { success: true, newPath };
    }
);

export const deleteProject = command(v.string(), async (projectId) => {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user) throw error(401, 'Unauthorized');

	await db
		.delete(table.vinumProject)
		.where(and(eq(table.vinumProject.id, projectId), eq(table.vinumProject.ownerId, user.id)));

	return { success: true };
});

export const updatePublicAccessLevel = command(
	v.object({
		projectId: v.string(),
		publicAccessLevel: v.union([v.literal('none'), v.literal('read'), v.literal('edit')])
	}),
	async ({ projectId, publicAccessLevel }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		await db
			.update(table.vinumProject)
			.set({ publicAccessLevel, updatedAt: new Date() })
			.where(and(eq(table.vinumProject.id, projectId), eq(table.vinumProject.ownerId, user.id)));

		return { success: true };
	}
);

export const inviteCollaborator = command(
	v.object({
		projectId: v.string(),
		email: v.pipe(v.string(), v.email()),
		role: v.union([v.literal('read'), v.literal('edit'), v.literal('admin')])
	}),
	async ({ projectId, email, role }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		// Find target user by email
		const [targetUser] = await db
			.select()
			.from(table.user)
			.where(eq(table.user.email, email));

		if (!targetUser) {
			return { success: false, error: 'User with this email not found.' };
		}

		if (targetUser.id === user.id) {
			return { success: false, error: 'You are already the owner of this project.' };
		}

		// Insert or update access
		const [existing] = await db
			.select()
			.from(table.vinumProjectAccess)
			.where(
				and(
					eq(table.vinumProjectAccess.projectId, projectId),
					eq(table.vinumProjectAccess.userId, targetUser.id)
				)
			);

		if (existing) {
			await db
				.update(table.vinumProjectAccess)
				.set({ role, allowWrite: role === 'edit' || role === 'admin' })
				.where(eq(table.vinumProjectAccess.id, existing.id));
		} else {
			await db.insert(table.vinumProjectAccess).values({
				projectId,
				userId: targetUser.id,
				role,
				allowWrite: role === 'edit' || role === 'admin'
			});
		}

		return { success: true };
	}
);

export const removeCollaborator = command(
	v.object({
		projectId: v.string(),
		userId: v.string()
	}),
	async ({ projectId, userId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		await db
			.delete(table.vinumProjectAccess)
			.where(
				and(
					eq(table.vinumProjectAccess.projectId, projectId),
					eq(table.vinumProjectAccess.userId, userId)
				)
			);

		return { success: true };
	}
);
