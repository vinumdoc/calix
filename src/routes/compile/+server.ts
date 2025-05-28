import type { RequestHandler } from './$types';
import { spawn } from 'node:child_process';
import { VINUM_PATH } from '$env/static/private';
import { json } from '@sveltejs/kit';

export const POST = (async ({ request }) => {
	const vinumCode = await request.text();

	const result = await new Promise<{ compiled: string; errors: string }>((resolve, reject) => {
		const child = spawn(VINUM_PATH);
		let compiled = '';
		let errors = '';

		child.stdout.on('data', (chunk) => (compiled += chunk));
		child.stderr.on('data', (chunk) => (errors += chunk));

		child.stdin.write(vinumCode);
		child.stdin.end();
		child.on('close', () => resolve({ compiled, errors }));
		child.on('error', (error) => reject(error));
	});

	return json(result);
}) satisfies RequestHandler;
