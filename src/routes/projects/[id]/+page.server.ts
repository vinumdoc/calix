import { db } from '$lib/server/db';
import { vinumProject, vinumDocument } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { compileDoc } from '$lib/remotes/compile.remote';

export const load: PageServerLoad = async ({ params }) => {
	const projectId = params.id;

	const [project] = await db.select().from(vinumProject).where(eq(vinumProject.id, projectId));
	if (!project) error(404, 'Project not found');

	const documents = await db.select().from(vinumDocument).where(eq(vinumDocument.projectId, projectId));

	return {
		project,
		documents
	};
};

export const actions: Actions = {
	compile: async ({ request }) => {
		const formData = await request.formData();
		const code = formData.get('code') as string;
		if (!code) return { compiled: '', errors: 'No code provided' };
		
		return await compileDoc(code);
	},
	createFile: async ({ request, params }) => {
		const formData = await request.formData();
		const relativePath = formData.get('relativePath') as string;
		const projectId = params.id;

		if (!relativePath) return { success: false, error: 'File name is required' };

		const [existing] = await db.select().from(vinumDocument).where(
			and(
				eq(vinumDocument.projectId, projectId),
				eq(vinumDocument.relativePath, relativePath)
			)
		);

		if (existing) return { success: false, error: 'File already exists' };

		await db.insert(vinumDocument).values({
			id: crypto.randomUUID(),
			projectId: projectId,
			relativePath: relativePath,
			body: ''
		});

		return { success: true };
	},
	deleteFile: async ({ request, params }) => {
		const formData = await request.formData();
		const relativePath = formData.get('relativePath') as string;
		const projectId = params.id;

		if (!relativePath) return { success: false, error: 'File path is required' };

		await db.delete(vinumDocument).where(
			and(
				eq(vinumDocument.projectId, projectId),
				eq(vinumDocument.relativePath, relativePath)
			)
		);

		return { success: true };
	},
	saveFile: async ({ request, params }) => {
		const formData = await request.formData();
		const relativePath = formData.get('relativePath') as string;
		const content = formData.get('content') as string;
		const projectId = params.id;

		if (!relativePath) return { success: false, error: 'File path is required' };

		await db
			.update(vinumDocument)
			.set({ body: content })
			.where(
				and(
					eq(vinumDocument.projectId, projectId),
					eq(vinumDocument.relativePath, relativePath)
				)
			);

		return { success: true };
	}
};
