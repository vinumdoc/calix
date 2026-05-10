<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { cn } from '$lib/utils.js';
	import Logo from './Logo.svelte';
	import * as Nav from '$lib/components/ui/navigation-menu';
</script>

<Nav.Root class="w-full justify-between">
	<Nav.List class="flex items-center space-x-4">
		<Nav.Item>
			<Nav.Link href="{base}/" class="ml-6 flex flex-row items-center justify-center">
				<Logo class="h-full" />
				<span class="hidden font-bold sm:inline-block"> Vinum </span>
			</Nav.Link>
		</Nav.Item>
		<Nav.Item>
			<Nav.Link
				href="{base}/projects"
				class={cn(
					'transition-colors hover:text-foreground/80',
					page.url.pathname.startsWith(`${base}/projects`) ? 'text-foreground' : 'text-foreground/60'
				)}
			>
				Projects
			</Nav.Link>
		</Nav.Item>
	</Nav.List>
</Nav.Root>
