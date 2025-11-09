import { compileDoc } from '$lib/remotes/compile.remote';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const code = decodeURIComponent(url.searchParams.get('code') || '');

	const { compiled, errors } = await compileDoc(code);

	return { compiled, source: code, errors };
};
