import { redirect, fail } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { vinumDocument, vinumProject } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, `${base}/auth/login`);
	}

	const projects = await db
		.select()
		.from(vinumProject)
		.where(eq(vinumProject.ownerId, locals.user.id));

	return {
		projects
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const name = data.get('name');

		if (!name || typeof name !== 'string') {
			return fail(400, { missing: true });
		}

		const projectId = crypto.randomUUID();
		await db.insert(vinumProject).values({
			id: projectId,
			ownerId: locals.user.id,
			name
		});

		await db.insert(vinumDocument).values({
			id: crypto.randomUUID(),
			projectId,
			relativePath: 'doc.vin',
			body: '[doc: Start writing your document]\n\n[doc]'
		});
	},
	rename: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = data.get('id');
		const name = data.get('name');

		if (!id || typeof id !== 'string' || !name || typeof name !== 'string') {
			return fail(400, { missing: true });
		}

		await db
			.update(vinumProject)
			.set({ name })
			.where(and(eq(vinumProject.id, id), eq(vinumProject.ownerId, locals.user.id)));
	},
	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = data.get('id');

		if (!id || typeof id !== 'string') {
			return fail(400, { missing: true });
		}

		await db
			.delete(vinumProject)
			.where(and(eq(vinumProject.id, id), eq(vinumProject.ownerId, locals.user.id)));
	}
};
