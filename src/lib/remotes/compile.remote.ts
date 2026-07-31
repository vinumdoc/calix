import { query } from '$app/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as v from 'valibot';

const template = `
[doc: <html><body> $* </body></html>]
[document: <html><body> $* </body></html>]
[title: <h1> $* </h1>]
[heading: <h2> $* </h2>]
[subheading: <h3> $* </h3>]
[paragraph: <p> $* </p>]
[p: <p> $* </p>]
[bold: <strong> $* </strong>]
[b: <strong> $* </strong>]
[italic: <em> $* </em>]
[i: <em> $* </em>]
[list: <ul> $* </ul>]
[orderedlist: <ol> $* </ol>]
[item: <li> $* </li>]
[section: <section> $* </section>]
[code: <code> $* </code>]
[codeblock: <pre><code> $* </code></pre>]
[quote: <blockquote> $* </blockquote>]
`;

export const compileDoc = query(v.string(), async (vinumCode) => {
	const VINUM_PATH = '/usr/local/bin/vinumc';

	// Check if vinumc exists
	if (!existsSync(VINUM_PATH)) {
		return {
			compiled: '',
			errors: `Error: vinumc not found at ${VINUM_PATH}. Please ensure it is properly installed.`
		};
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
			errors += JSON.stringify(error);
			resolve({ compiled, errors });
			// reject(new Error(`Failed to write to vinumc stdin: ${error.message}`));
		});

		child.on('close', (code) => {
			const exitMessage = code === null ? '' : ` with code ${code}`;
			console.log(`vinumc process exited${exitMessage}`);
			resolve({ compiled, errors });
		});

		// Write to stdin with error handling
		try {
			child.stdin.write(template);
			child.stdin.write(vinumCode);
			child.stdin.end();
		} catch (error) {
			console.error('Write error:', error, errors);

			// reject(
			// 	new Error(`Failed to write code to vinumc: ${errors}`, {
			// 		cause: error
			// 	})
			// );
		}
	});

	return result;
});
