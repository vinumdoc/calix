import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth';

export const queryUser = query(() => {
	const event = getRequestEvent();

	return event.locals.user;
});

export const login = form(
	v.object({
		email: v.pipe(v.string(), v.email()),
		password: v.pipe(v.string(), v.minLength(6), v.maxLength(255))
	}),
	async ({ email, password }) => {
		const results = await db.select().from(table.user).where(eq(table.user.email, email));

		const existingUser = results[0];
		if (!existingUser) {
			error(400, { message: 'Incorrect username or password' });
		}

		const event = getRequestEvent();

		const data = await auth.api.signInEmail({
			body: {
				email,
				password
			},
			headers: event.request.headers
		});

		return data;

		// const validPassword = await verify(existingUser.passwordHash, password, {
		// 	memoryCost: 19456,
		// 	timeCost: 2,
		// 	outputLen: 32,
		// 	parallelism: 1
		// });

		// if (!validPassword) {
		// 	error(400, { message: 'Incorrect username or password' });
		// }

		// const session = await auth.createSession(existingUser.id);

		// auth.setSessionTokenCookie(event, session.id, session.expiresAt);
		// queryUser().set({ id: existingUser.id, username: existingUser.username });

		// redirect(302, '/');
	}
);

export const register = form(
	v.object({
		username: v.pipe(v.string(), v.minLength(3), v.maxLength(31)),
		password: v.pipe(v.string(), v.minLength(8), v.maxLength(255)),
		confirmPassword: v.pipe(v.string(), v.minLength(8), v.maxLength(255)),
		email: v.pipe(v.string(), v.email())
	}),
	async ({ username, email, password, confirmPassword }, invalid) => {
		if (password !== confirmPassword) {
			invalid(invalid.confirmPassword('Passwords do not match'));
		}

		const event = getRequestEvent();

		try {
			const { token } = await auth.api.signUpEmail({
				body: {
					email,
					password,
					name: username
				},
				headers: event.request.headers
			});
			return { token };
		} catch (e) {
			if (e instanceof APIError) {
				if (
					e.status === 'UNPROCESSABLE_ENTITY' &&
					e.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
				) {
					invalid(invalid.email('A user with this email already exists'));
				}
			}
		}
	}
);

export const logout = command(async () => {
	const event = getRequestEvent();

	const { session } = event.locals;
	if (!session) return;

	await auth.api.signOut({
		headers: event.request.headers
	});

	// await auth.invalidateSession(session.id);
	// auth.deleteSessionTokenCookie(event);
});
