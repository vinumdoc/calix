<script lang="ts">
	// import { buttonVariants } from '$lib/registry/new-york/ui/button/index.js';
	// import { cn } from '$lib/utils.js';
	import MainNav from './MainNav.svelte';
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="container flex h-14 max-w-screen-2xl items-center">
		<MainNav />
		<!-- <MobileNav /> -->
		<div class="flex flex-1 items-center justify-between space-x-2 md:justify-end">
			<div class="w-full flex-1 md:w-auto md:flex-none">
				<!-- <CommandMenu /> -->
			</div>
			<nav class="flex items-center">
				<!-- <ModeToggle /> -->
			</nav>
		</div>
	</div>
</header>
