<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils.js';
	import Logo from './Logo.svelte';
</script>

<div class="mr-4 hidden md:flex">
	<a href="/" class="mr-6 flex items-center space-x-2">
		<Logo class="h-6 w-6" />
		<span class="hidden font-bold xl:inline-block"> Vinum </span>
	</a>
	<nav class="flex items-center gap-6 text-sm">
		<a
			href="/docs"
			class={cn(
				'transition-colors hover:text-foreground/80',
				page.url.pathname === '/docs' ? 'text-foreground' : 'text-foreground/60'
			)}
		>
			Docs
		</a>
		<a
			href="/examples"
			class={cn(
				'transition-colors hover:text-foreground/80',
				page.url.pathname === '/examples' ? 'text-foreground' : 'text-foreground/60'
			)}
		>
			Examples
		</a>
		<!-- <a
			href="/docs/components"
			class={cn(
				'transition-colors hover:text-foreground/80',
				page.url.pathname.startsWith('/docs/components') ? 'text-foreground' : 'text-foreground/60'
			)}
		>
			Components
		</a>
		<a
			href="/themes"
			class={cn(
				'transition-colors hover:text-foreground/80',
				page.url.pathname.startsWith('/themes') ? 'text-foreground' : 'text-foreground/60'
			)}
		>
			Themes
		</a>
		<a
			href="/examples"
			class={cn(
				'transition-colors hover:text-foreground/80',
				page.url.pathname.startsWith('/examples') ? 'text-foreground' : 'text-foreground/60'
			)}
		>
			Examples
		</a>

		<a
			href="/blocks"
			class={cn(
				'transition-colors hover:text-foreground/80',
				page.url.pathname.startsWith('/blocks') ? 'text-foreground' : 'text-foreground/60'
			)}
		>
			Blocks
		</a>
		<a
			href="/colors"
			class={cn(
				'transition-colors hover:text-foreground/80',
				page.url.pathname.startsWith('/colors') ? 'text-foreground' : 'text-foreground/60'
			)}
		>
			Colors
		</a> -->
	</nav>
</div>
