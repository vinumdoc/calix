import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, resolve('/auth/login'));
	}

	const projects = await db
		.select()
		.from(table.vinumProject)
		.where(eq(table.vinumProject.ownerId, event.locals.user.id));

	return {
		user: event.locals.user,
		projects
	};
};
