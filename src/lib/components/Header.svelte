<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidate } from '$app/navigation';
	import { sessionDependencyUrl } from '$lib';
	import { logout, queryUser } from '$lib/remotes/auth.remote';
	// import { buttonVariants } from '$lib/registry/new-york/ui/button/index.js';
	// import { cn } from '$lib/utils.js';
	import MainNav from './MainNav.svelte';
	import Button from './ui/button/button.svelte';

	let { user }: { user: { id: string; name: string } | undefined } = $props();
	async function handleLogout() {
		await logout();
		await invalidate(sessionDependencyUrl);
	}
</script>

<header
	class="sticky top-0 z-50 flex h-[var(--sticky-header-height)] w-full items-center border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<MainNav />
	<!-- <MobileNav /> -->
	<div class="flex flex-1 items-center justify-between space-x-2 md:justify-end">
		<div class="w-full flex-1 md:w-auto md:flex-none">
			<!-- <CommandMenu /> -->
		</div>
		<nav class="flex items-center pr-4">
			{#if user}
				<span class="mr-4 hidden md:inline">Hello, {user.name}!</span>
				<Button variant="outline" onclick={handleLogout}>Logout</Button>
			{:else}
				<Button variant="outline" href={resolve('/auth/signup')} class="mr-2">Sign Up</Button>
				<Button href={resolve('/auth/login')}>Login</Button>
			{/if}
			<!-- <ModeToggle /> -->
		</nav>
	</div>
</header>
