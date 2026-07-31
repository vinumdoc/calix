/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { lezer } from '@lezer/generator/rollup';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		}) as never,
		lezer() as never
	],
	test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
});
