import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import * as v from 'valibot';
import * as auth from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { hash, verify } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';

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
		console.log(existingUser);
		const validPassword = await verify(existingUser.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		if (!validPassword) {
			error(400, { message: 'Incorrect username or password' });
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser.id);

		const event = getRequestEvent();
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		redirect(302, '/');
	}
);

export const register = form(
	v.object({
		username: v.pipe(v.string(), v.minLength(3), v.maxLength(31)),
		password: v.pipe(v.string(), v.minLength(6), v.maxLength(255)),
		email: v.pipe(v.string(), v.email())
	}),
	async ({ username, password, email }) => {
		const userId = generateUserId();
		const passwordHash = await hash(password, {
			// recommended minimum parameters
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		await db.insert(table.user).values({ id: userId, email, username, passwordHash });

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, userId);

		const event = getRequestEvent();
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		redirect(302, '/');
	}
);

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase32LowerCase(bytes);
	return id;
}
