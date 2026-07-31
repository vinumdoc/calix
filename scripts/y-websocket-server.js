import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils';
import postgres from 'postgres';
import 'dotenv/config';

const port = process.env.YJS_WS_PORT || 1234;
const dbUrl = process.env.DATABASE_URL;

let sql = null;
if (dbUrl) {
	sql = postgres(dbUrl, { max: 5 });
	console.log('📦 Yjs WebSocket persistence connected to PostgreSQL');
}

// Attach Yjs persistence handlers to load from and save to PostgreSQL
setPersistence({
	bindState: async (docName, ydoc) => {
		// docName format: "project-{projectId}-{relativePath}"
		console.log(`[Yjs Room] Binding state for room: ${docName}`);
		const ytext = ydoc.getText('codemirror');

		if (!sql) return;

		try {
			const parts = docName.split('__');
			if (parts.length >= 2) {
				const projectId = parts[0];
				const relativePath = parts.slice(1).join('__');

				const rows = await sql`
					SELECT body FROM vinum_document 
					WHERE project_id = ${projectId} AND relative_path = ${relativePath}
					LIMIT 1
				`;

				if (rows.length > 0 && rows[0].body && ytext.length === 0) {
					ytext.insert(0, rows[0].body);
					console.log(`[Yjs Room] Loaded ${rows[0].body.length} chars from DB for ${relativePath}`);
				}
			}
		} catch (err) {
			console.error(`[Yjs Room Error] Failed to load doc ${docName} from DB:`, err);
		}
	},
	writeState: async (docName, ydoc) => {
		// Save ytext.toString() back to Postgres
		if (!sql) return;

		try {
			const parts = docName.split('__');
			if (parts.length >= 2) {
				const projectId = parts[0];
				const relativePath = parts.slice(1).join('__');
				const ytext = ydoc.getText('codemirror');
				const content = ytext.toString();

				await sql`
					UPDATE vinum_document 
					SET body = ${content}, size = ${Buffer.byteLength(content, 'utf-8')}, updated_at = NOW()
					WHERE project_id = ${projectId} AND relative_path = ${relativePath}
				`;

				console.log(`[Yjs Room] Saved ${content.length} chars to DB for ${relativePath}`);
			}
		} catch (err) {
			console.error(`[Yjs Room Error] Failed to save doc ${docName} to DB:`, err);
		}
	}
});

const server = createServer((req, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.end('Yjs WebSocket Server Running\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
	console.log(`[Yjs WS] Client connected: ${req.url}`);
	setupWSConnection(conn, req);
});

server.listen(port, () => {
	console.log(`🚀 Yjs WebSocket CRDT Server running on port ${port}`);
});
