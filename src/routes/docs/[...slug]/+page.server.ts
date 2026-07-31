import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug || '01-getting-started/01-introduction';

	// Load markdown files from content/docs
	const modules = import.meta.glob('/src/content/docs/**/*.md', {
		query: '?raw',
		eager: true
	}) as Record<string, { default: string }>;

	const docList: Array<{ slug: string; title: string; category: string }> = [];
	let currentContent = '';
	let currentTitle = 'Documentation';

	for (const path in modules) {
		const relativePath = path.replace('/src/content/docs/', '').replace('.md', '');
		const rawContent = modules[path].default || '';

		// Simple frontmatter parsing
		const match = rawContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		let title = relativePath;
		let category = 'General';
		let body = rawContent;

		if (match) {
			const frontmatter = match[1];
			body = match[2];
			const titleMatch = frontmatter.match(/title:\s*(.*)/);
			const categoryMatch = frontmatter.match(/category:\s*(.*)/);
			if (titleMatch) title = titleMatch[1].trim();
			if (categoryMatch) category = categoryMatch[1].trim();
		}

		docList.push({ slug: relativePath, title, category });

		if (relativePath === slug || relativePath.endsWith(slug)) {
			currentContent = body;
			currentTitle = title;
		}
	}

	if (!currentContent && docList.length > 0) {
		// Fallback to first document
		const first = docList[0];
		return {
			slug: first.slug,
			title: first.title,
			content: '# Documentation\n\nSelect a topic from the sidebar.',
			docList
		};
	}

	return {
		slug,
		title: currentTitle,
		content: currentContent,
		docList
	};
};
