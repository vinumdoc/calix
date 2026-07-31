import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const projectId = event.params.id;

	const [project] = await db
		.select()
		.from(table.vinumProject)
		.where(eq(table.vinumProject.id, projectId));

	if (!project) throw error(404, 'Project not found');

	const collaborators = await db
		.select({
			id: table.vinumProjectAccess.id,
			userId: table.user.id,
			name: table.user.name,
			email: table.user.email,
			role: table.vinumProjectAccess.role
		})
		.from(table.vinumProjectAccess)
		.innerJoin(table.user, eq(table.vinumProjectAccess.userId, table.user.id))
		.where(eq(table.vinumProjectAccess.projectId, projectId));

	const user = event.locals.user;
	const isOwner = user?.id === project.ownerId;
	const userAccess = user ? collaborators.find((c) => c.userId === user.id) : null;

	// Permission check: If private, block non-owners/non-collaborators
	if (!isOwner && project.publicAccessLevel === 'none' && !userAccess) {
		throw error(403, 'Forbidden: This project is private.');
	}

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

	// Compute canEdit boolean
	const canEdit =
		isOwner ||
		project.publicAccessLevel === 'edit' ||
		userAccess?.role === 'edit' ||
		userAccess?.role === 'admin';

	return {
		project,
		files,
		collaborators,
		isOwner,
		canEdit,
		user: event.locals.user
	};
};
