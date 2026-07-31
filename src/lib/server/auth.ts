import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const auth = betterAuth({
	baseURL: publicEnv.PUBLIC_BETTER_AUTH_BASE_URL,
	basePath: publicEnv.PUBLIC_BETTER_AUTH_BASE_PATH,
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	emailAndPassword: {
		enabled: true,
		async sendResetPassword({ user, url, token }) {
			console.log(`[Password Reset] Send link to ${user.email}: ${url}?token=${token}`);
		}
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID || '',
			clientSecret: env.GOOGLE_CLIENT_SECRET || ''
		},
		github: {
			clientId: env.GITHUB_CLIENT_ID || '',
			clientSecret: env.GITHUB_CLIENT_SECRET || ''
		}
	},
	advanced: {
		database: {
			generateId: 'uuid'
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
