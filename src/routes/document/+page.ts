import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, fetch }) => {
	const code = decodeURIComponent(url.searchParams.get('code') || '');

	let compiled = '';
	let errors = '';
	if (code) {
		try {
			const response = await fetch('/compile', {
				method: 'POST',
				body: code
			});
			({ compiled, errors } = await response.json());
		} catch (error) {
			console.error('Compilation error:', error);
			compiled = 'Error during compilation.';
		}
	}

	return { compiled, source: code, errors };
};
