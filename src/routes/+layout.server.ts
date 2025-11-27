import { sessionDependencyUrl } from '$lib';

export const load = async ({ locals, depends }) => {
	depends(sessionDependencyUrl);
	return { user: locals.user };
};
