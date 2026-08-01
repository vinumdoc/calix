import { query } from '$app/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as v from 'valibot';

const template = `
[doc: {#
<html>
<head>
  <meta charset="utf-8" />
  <style>
    /* Page & Print Setup */
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 15mm;
    }

    /* Base Typography & Styling */
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }

    /* Page Break Management */
    h1, h2, h3, h4 {
      break-after: avoid; /* Don't leave headings orphan at the bottom of a page */
    }

    table, tr, img, pre, blockquote, figure, .no-break {
      break-inside: avoid; /* Prevent tables, code blocks, or images from splitting across page cuts */
    }

    p {
      orphans: 3;
      widows: 3;
    }

    /* Table Formatting for Print */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }

    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }

    th {
      background-color: #f8fafc;
    }

		.page-break {
			break-before: page; /* Modern CSS standard */
				page-break-before: always; /* Legacy fallback for older renderers */
		}
  </style>
  </style>
</head>
<body>
#}
	$*
{#
</body></html>
#}

]
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
[page-break: <div class="page-break"></div>]
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
