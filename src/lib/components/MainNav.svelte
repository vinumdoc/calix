<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils.js';
	import Logo from './Logo.svelte';
	import * as Nav from '$lib/components/ui/navigation-menu';
</script>

<Nav.Root class="w-full justify-between">
	<Nav.List>
		<Nav.Item>
			<Nav.Link href="/" class="ml-6 flex flex-row items-center justify-center">
				<Logo class="h-full" />
				<span class="hidden font-bold sm:inline-block"> Vinum </span>
			</Nav.Link>
		</Nav.Item>
	</Nav.List>
</Nav.Root>
