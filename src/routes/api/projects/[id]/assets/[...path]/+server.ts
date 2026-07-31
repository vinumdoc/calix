import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const { id: projectId, path } = params;

	if (!projectId || !path) {
		throw error(400, 'Invalid parameters');
	}

	const [doc] = await db
		.select()
		.from(table.vinumDocument)
		.where(
			and(
				eq(table.vinumDocument.projectId, projectId),
				eq(table.vinumDocument.relativePath, path)
			)
		);

	if (!doc) {
		throw error(404, 'Asset not found');
	}

	if (doc.isBinary && doc.binaryData) {
		return new Response(new Uint8Array(doc.binaryData), {
			headers: {
				'Content-Type': doc.mimeType || 'application/octet-stream',
				'Content-Length': String(doc.size || doc.binaryData.length),
				'Cache-Control': 'public, max-age=3600'
			}
		});
	}

	return new Response(doc.body, {
		headers: {
			'Content-Type': doc.mimeType || 'text/plain; charset=utf-8'
		}
	});
};
