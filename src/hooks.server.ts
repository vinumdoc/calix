import { auth } from '$lib/server/auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';

// creating a handle to use the paraglide middleware
const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;

		return resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replace('%lang%', locale);
			}
		});
	});

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({
		auth,
		building,
		event,
		resolve
	});
};

export const handle: Handle = sequence(handleParaglide, handleAuth);

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();

	console.log(`Error ID: ${errorId}`);
	console.error(`Status: ${status}`);
	console.error(`Message: ${message}`);
	console.error(`Event: ${event.url.pathname}`);
	console.error(error);

	return {
		message: `An unexpected error occurred. Please contact support with Error ID: ${errorId}`,
		code: errorId
	};
};
