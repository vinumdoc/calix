import { command, getRequestEvent, query } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import * as v from 'valibot';
import { eq, and, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const listProjects = query(async () => {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user) return [];

	// Fetch projects owned by user or shared with user
	const userProjects = await db
		.select({
			id: table.vinumProject.id,
			name: table.vinumProject.name,
			description: table.vinumProject.description,
			entryFilePath: table.vinumProject.entryFilePath,
			publicAccessLevel: table.vinumProject.publicAccessLevel,
			createdAt: table.vinumProject.createdAt,
			updatedAt: table.vinumProject.updatedAt,
			ownerId: table.vinumProject.ownerId
		})
		.from(table.vinumProject)
		.where(eq(table.vinumProject.ownerId, user.id));

	return userProjects;
});

export const createProject = command(
	v.object({
		name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
		description: v.optional(v.string()),
		entryFilePath: v.optional(v.string())
	}),
	async ({ name, description, entryFilePath }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const rawPath = entryFilePath?.trim();
		let resolvedEntryPath = rawPath ? (rawPath.endsWith('.vin') ? rawPath : `${rawPath}.vin`) : 'main.vin';
		if (resolvedEntryPath.startsWith('cocktail/')) {
			resolvedEntryPath = resolvedEntryPath.replace(/^cocktail\//, '') || 'main.vin';
		}

		const [newProject] = await db
			.insert(table.vinumProject)
			.values({
				ownerId: user.id,
				name,
				description: description || '',
				entryFilePath: resolvedEntryPath
			})
			.returning();

		// Create default entry file
		const defaultCode = `[doc [paragraph Hello World]]`;
		const defaultCocktail = `[doc: {#
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
[page-break: <div class="page-break"></div>]`;

		await db.insert(table.vinumDocument).values([
			{
				projectId: newProject.id,
				relativePath: resolvedEntryPath,
				mimeType: 'text/plain',
				isBinary: false,
				body: defaultCode,
				size: Buffer.byteLength(defaultCode, 'utf-8')
			},
			{
				projectId: newProject.id,
				relativePath: 'cocktail/html-template.vin',
				mimeType: 'text/plain',
				isBinary: false,
				body: defaultCocktail,
				size: Buffer.byteLength(defaultCocktail, 'utf-8')
			}
		]);

		return newProject;
	}
);

export const getProjectWithFiles = query(v.string(), async (projectId) => {
	const event = getRequestEvent();
	const user = event.locals.user;

	const [project] = await db
		.select()
		.from(table.vinumProject)
		.where(eq(table.vinumProject.id, projectId));

	if (!project) throw error(404, 'Project not found');

	// Access check: owner or public read/edit or collaborator
	const isOwner = user && project.ownerId === user.id;
	if (!isOwner && project.publicAccessLevel === 'none') {
		if (!user) throw error(401, 'Unauthorized');

		const [access] = await db
			.select()
			.from(table.vinumProjectAccess)
			.where(
				and(
					eq(table.vinumProjectAccess.projectId, projectId),
					eq(table.vinumProjectAccess.userId, user.id)
				)
			);

		if (!access) throw error(403, 'Forbidden');
	}

	// Fetch documents (without heavy binary payload for listing)
	const files = await db
		.select({
			id: table.vinumDocument.id,
			relativePath: table.vinumDocument.relativePath,
			mimeType: table.vinumDocument.mimeType,
			isBinary: table.vinumDocument.isBinary,
			body: table.vinumDocument.body,
			size: table.vinumDocument.size,
			updatedAt: table.vinumDocument.updatedAt
		})
		.from(table.vinumDocument)
		.where(eq(table.vinumDocument.projectId, projectId))
		.orderBy(asc(table.vinumDocument.relativePath));

	return {
		project,
		files,
		isOwner
	};
});

export const saveFileContent = command(
	v.object({
		projectId: v.string(),
		relativePath: v.string(),
		body: v.string()
	}),
	async ({ projectId, relativePath, body }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		// Check if file exists
		const [existing] = await db
			.select()
			.from(table.vinumDocument)
			.where(
				and(
					eq(table.vinumDocument.projectId, projectId),
					eq(table.vinumDocument.relativePath, relativePath)
				)
			);

		if (existing) {
			await db
				.update(table.vinumDocument)
				.set({
					body,
					size: Buffer.byteLength(body, 'utf-8'),
					updatedAt: new Date()
				})
				.where(eq(table.vinumDocument.id, existing.id));
		} else {
			await db.insert(table.vinumDocument).values({
				projectId,
				relativePath,
				mimeType: 'text/plain',
				isBinary: false,
				body,
				size: Buffer.byteLength(body, 'utf-8')
			});
		}

		return { success: true };
	}
);

async function verifyProjectEditAccess(projectId: string, userId: string) {
	const [project] = await db
		.select()
		.from(table.vinumProject)
		.where(eq(table.vinumProject.id, projectId));

	if (!project) throw error(404, 'Project not found');

	const isOwner = project.ownerId === userId;
	if (!isOwner && project.publicAccessLevel !== 'edit') {
		const [access] = await db
			.select()
			.from(table.vinumProjectAccess)
			.where(
				and(
					eq(table.vinumProjectAccess.projectId, projectId),
					eq(table.vinumProjectAccess.userId, userId)
				)
			);

		if (!access || (access.role !== 'edit' && access.role !== 'admin')) {
			throw error(403, 'Forbidden: You do not have edit access to this project.');
		}
	}

	return project;
}

export const deleteFile = command(
	v.object({
		projectId: v.string(),
		relativePath: v.string()
	}),
	async ({ projectId, relativePath }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		const proj = await verifyProjectEditAccess(projectId, user.id);

		if (proj.entryFilePath === relativePath) {
			throw error(400, 'Cannot delete the active entry file.');
		}

		await db
			.delete(table.vinumDocument)
			.where(
				and(
					eq(table.vinumDocument.projectId, projectId),
					eq(table.vinumDocument.relativePath, relativePath)
				)
			);

		return { success: true };
	}
);

export const renameFile = command(
    v.object({
        projectId: v.string(),
        oldPath: v.string(),
        newPath: v.string()
    }),
    async ({ projectId, oldPath, newPath }) => {
        const event = getRequestEvent();
        const user = event.locals.user;
        if (!user) throw error(401, 'Unauthorized');

        const proj = await verifyProjectEditAccess(projectId, user.id);

        await db
            .update(table.vinumDocument)
            .set({ relativePath: newPath })
            .where(
                and(
                    eq(table.vinumDocument.projectId, projectId),
                    eq(table.vinumDocument.relativePath, oldPath)
                )
            );

        // Auto-sync project entryFilePath if the entry file was renamed
        if (proj.entryFilePath === oldPath) {
            await db
                .update(table.vinumProject)
                .set({ entryFilePath: newPath, updatedAt: new Date() })
                .where(eq(table.vinumProject.id, projectId));
        }

        return { success: true, newPath };
    }
);

export const updateProjectEntryFile = command(
	v.object({
		projectId: v.string(),
		entryFilePath: v.pipe(v.string(), v.minLength(1))
	}),
	async ({ projectId, entryFilePath }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		await verifyProjectEditAccess(projectId, user.id);

		if (entryFilePath.startsWith('cocktail/')) {
			throw error(400, 'Cocktail files cannot be set as the entry document.');
		}

		// Verify file exists in project documents and is not binary
		const [doc] = await db
			.select()
			.from(table.vinumDocument)
			.where(
				and(
					eq(table.vinumDocument.projectId, projectId),
					eq(table.vinumDocument.relativePath, entryFilePath)
				)
			);

		if (!doc) {
			throw error(404, `File "${entryFilePath}" does not exist in this project.`);
		}
		if (doc.isBinary) {
			throw error(400, 'Binary asset files cannot be set as the entry document.');
		}

		await db
			.update(table.vinumProject)
			.set({ entryFilePath, updatedAt: new Date() })
			.where(eq(table.vinumProject.id, projectId));

		return { success: true, entryFilePath };
	}
);

export const updateProjectDetails = command(
	v.object({
		projectId: v.string(),
		name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
		description: v.optional(v.string()),
		entryFilePath: v.optional(v.string())
	}),
	async ({ projectId, name, description, entryFilePath }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		await verifyProjectEditAccess(projectId, user.id);

		const updates: Partial<typeof table.vinumProject.$inferInsert> = {
			name,
			description: description || '',
			updatedAt: new Date()
		};

		if (entryFilePath) {
			if (entryFilePath.startsWith('cocktail/')) {
				throw error(400, 'Cocktail files cannot be set as the entry document.');
			}
			const [doc] = await db
				.select()
				.from(table.vinumDocument)
				.where(
					and(
						eq(table.vinumDocument.projectId, projectId),
						eq(table.vinumDocument.relativePath, entryFilePath)
					)
				);
			if (!doc) throw error(404, `File "${entryFilePath}" not found.`);
			if (doc.isBinary) throw error(400, 'Binary assets cannot be the entry document.');
			updates.entryFilePath = entryFilePath;
		}

		await db
			.update(table.vinumProject)
			.set(updates)
			.where(eq(table.vinumProject.id, projectId));

		return { success: true };
	}
);

export const deleteProject = command(v.string(), async (projectId) => {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user) throw error(401, 'Unauthorized');

	await db
		.delete(table.vinumProject)
		.where(and(eq(table.vinumProject.id, projectId), eq(table.vinumProject.ownerId, user.id)));

	return { success: true };
});

export const updatePublicAccessLevel = command(
	v.object({
		projectId: v.string(),
		publicAccessLevel: v.union([v.literal('none'), v.literal('read'), v.literal('edit')])
	}),
	async ({ projectId, publicAccessLevel }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		await db
			.update(table.vinumProject)
			.set({ publicAccessLevel, updatedAt: new Date() })
			.where(and(eq(table.vinumProject.id, projectId), eq(table.vinumProject.ownerId, user.id)));

		return { success: true };
	}
);

export const inviteCollaborator = command(
	v.object({
		projectId: v.string(),
		email: v.pipe(v.string(), v.email()),
		role: v.union([v.literal('read'), v.literal('edit'), v.literal('admin')])
	}),
	async ({ projectId, email, role }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		// Find target user by email
		const [targetUser] = await db
			.select()
			.from(table.user)
			.where(eq(table.user.email, email));

		if (!targetUser) {
			return { success: false, error: 'User with this email not found.' };
		}

		if (targetUser.id === user.id) {
			return { success: false, error: 'You are already the owner of this project.' };
		}

		// Insert or update access
		const [existing] = await db
			.select()
			.from(table.vinumProjectAccess)
			.where(
				and(
					eq(table.vinumProjectAccess.projectId, projectId),
					eq(table.vinumProjectAccess.userId, targetUser.id)
				)
			);

		if (existing) {
			await db
				.update(table.vinumProjectAccess)
				.set({ role, allowWrite: role === 'edit' || role === 'admin' })
				.where(eq(table.vinumProjectAccess.id, existing.id));
		} else {
			await db.insert(table.vinumProjectAccess).values({
				projectId,
				userId: targetUser.id,
				role,
				allowWrite: role === 'edit' || role === 'admin'
			});
		}

		return { success: true };
	}
);

export const removeCollaborator = command(
	v.object({
		projectId: v.string(),
		userId: v.string()
	}),
	async ({ projectId, userId }) => {
		const event = getRequestEvent();
		const user = event.locals.user;
		if (!user) throw error(401, 'Unauthorized');

		await db
			.delete(table.vinumProjectAccess)
			.where(
				and(
					eq(table.vinumProjectAccess.projectId, projectId),
					eq(table.vinumProjectAccess.userId, userId)
				)
			);

		return { success: true };
	}
);
