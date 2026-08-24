import { query } from '$app/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import * as v from 'valibot';

import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, like, and } from 'drizzle-orm';

export const compileDoc = query(v.string(), async (projectId) => {
	const VINUM_PATH = '/usr/local/bin/vinumc';

	if (!existsSync(VINUM_PATH)) {
		return {
			compiled: '',
			errors: `Error: vinumc not found at ${VINUM_PATH}. Please ensure it is properly installed.`
		};
	}

	const allFiles = await db
		.select()
		.from(table.vinumDocument)
		.where(eq(table.vinumDocument.projectId, projectId));

	if (allFiles.length === 0) {
		return { compiled: '', errors: 'No files found in database to compile.' };
	}

	const tempDir = path.join(os.tmpdir(), `vinum-${randomUUID()}`);
	await fs.mkdir(tempDir, { recursive: true });

	const args: string[] = [];
	// TODO: remove when vinumc allows multiple source files
	let sourceContent = '';

	try {
		for (const file of allFiles) {
			if (file.relativePath.startsWith('cocktail/')) {
				const fullPath = path.join(tempDir, file.relativePath);
				await fs.mkdir(path.dirname(fullPath), { recursive: true });
				await fs.writeFile(fullPath, file.body);

				args.push('--effect', fullPath);
			} else {
				sourceContent += `\n\n${file.body}\n`;
			}
		}

		// TODO: remove when vinumc allows multiple source files
		const entryPath = path.join(tempDir, '_source.vin');
    await fs.writeFile(entryPath, sourceContent);
    args.push(entryPath);

		const result = await new Promise<{ compiled: string; errors: string }>((resolve, reject) => {
			const child = spawn(VINUM_PATH, args, {
				stdio: ['ignore', 'pipe', 'pipe'] 
			});

			let compiled = '';
			let errors = '';

			child.stdout.on('data', (chunk) => (compiled += chunk));
			child.stderr.on('data', (chunk) => (errors += chunk));

			child.on('error', (error) => reject(new Error(`Failed to spawn vinumc: ${error.message}`)));

			child.on('close', (code) => {
				resolve({ compiled, errors });
			});
		});

		return result;

	} finally {
		await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
	}
});
