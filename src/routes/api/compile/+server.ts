import { compileDoc } from '$lib/remotes/compile.remote';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { code } = await request.json();
	if (typeof code !== 'string') {
		return json({ compiled: '', errors: 'Invalid code' }, { status: 400 });
	}
	const result = await compileDoc(code);
	return json(result);
};
