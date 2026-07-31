import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const projectId = params.id;

	// Check user permissions on project
	const [project] = await db
		.select()
		.from(table.vinumProject)
		.where(eq(table.vinumProject.id, projectId));

	if (!project) throw error(404, 'Project not found');

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const relativePath = (formData.get('path') as string) || file?.name;

	if (!file || !relativePath) {
		return json({ error: 'No file or path provided' }, { status: 400 });
	}

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const mimeType = file.type || 'application/octet-stream';

	// Save or overwrite file in Postgres
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
				mimeType,
				isBinary: true,
				binaryData: buffer,
				size: buffer.length,
				updatedAt: new Date()
			})
			.where(eq(table.vinumDocument.id, existing.id));
	} else {
		await db.insert(table.vinumDocument).values({
			projectId,
			relativePath,
			mimeType,
			isBinary: true,
			body: '',
			binaryData: buffer,
			size: buffer.length
		});
	}

	return json({
		success: true,
		path: relativePath,
		size: buffer.length,
		mimeType
	});
};
