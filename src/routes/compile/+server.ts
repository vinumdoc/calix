import type { RequestHandler } from './$types';
import { spawn } from 'node:child_process';
import { json } from '@sveltejs/kit';
import { existsSync } from 'node:fs';

export const POST = (async ({ request }) => {
	const vinumCode = await request.text();
	const VINUM_PATH = '/usr/local/bin/vinumc';

	// Check if vinumc exists
	if (!existsSync(VINUM_PATH)) {
		return json(
			{
				compiled: '',
				errors: `Error: vinumc not found at ${VINUM_PATH}. Please ensure it is properly installed.`
			},
			{ status: 500 }
		);
	}

	const result = await new Promise<{ compiled: string; errors: string }>((resolve, reject) => {
		const child = spawn(VINUM_PATH, [], {
			stdio: ['pipe', 'pipe', 'pipe']
		});

		let compiled = '';
		let errors = '';

		child.stdout.on('data', (chunk) => (compiled += chunk));
		child.stderr.on('data', (chunk) => (errors += chunk));

		// Handle process errors
		child.on('error', (error) => {
			console.error('Process spawn error:', error);
			reject(new Error(`Failed to spawn vinumc: ${error.message}`));
		});

		// Handle stdin errors
		child.stdin.on('error', (error) => {
			console.error('Stdin error:', error);
			reject(new Error(`Failed to write to vinumc stdin: ${error.message}`));
		});

		child.on('close', (code) => {
			const exitMessage = code === null ? '' : ` with code ${code}`;
			console.log(`vinumc process exited${exitMessage}`);
			resolve({ compiled, errors });
		});

		// Write to stdin with error handling
		try {
			child.stdin.write(vinumCode);
			child.stdin.end();
		} catch (error) {
			console.error('Write error:', error);
			reject(new Error(`Failed to write code to vinumc: ${error}`));
		}
	});

	return json(result);
}) satisfies RequestHandler;
