import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { lezer } from '@lezer/generator/rollup';

export default defineConfig({
	plugins: [
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		}) as never, // TODO: remove these after these plugins update their types
		lezer() as never
	],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
