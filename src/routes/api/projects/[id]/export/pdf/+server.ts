import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { compileDoc } from '$lib/remotes/compile.remote';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const { id: projectId } = params;

	const [project] = await db
		.select()
		.from(table.vinumProject)
		.where(eq(table.vinumProject.id, projectId));

	if (!project) throw error(404, 'Project not found');

	// Load entry document
	const [entryDoc] = await db
		.select()
		.from(table.vinumDocument)
		.where(
			and(
				eq(table.vinumDocument.projectId, projectId),
				eq(table.vinumDocument.relativePath, project.entryFilePath)
			)
		);

	const code = entryDoc?.body || '[document: Empty document]';
	const compileResult = await compileDoc(code);

	const htmlContent = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>${project.name}</title>
	<style>
		@page { margin: 20mm; }
		body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #111; }
	</style>
</head>
<body>
	${compileResult.compiled}
</body>
</html>`;

	// Return clean HTML with print trigger or direct PDF content
	return new Response(htmlContent, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Disposition': `inline; filename="${project.name}.html"`
		}
	});
};
