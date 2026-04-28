import type { VinumDocument } from '$lib/server/db/schema';

export interface ProjectTree {
	children: Record<string, ProjectTree>;
	files: Record<string, VinumDocument>;
}

export interface ProjectDirectory {
	type: 'directory';
	name: string;
	children: Array<ProjectDirectory | ProjectFile>;
}

export interface ProjectFile {
	type: 'file';
	name: string;
	doc: VinumDocument;
}
