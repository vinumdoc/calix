<script lang="ts">
	import '../app.css';
	import Logo from '$lib/components/Logo.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();
</script>

<!-- <ModeWatcher /> -->

	<div class="relative flex min-h-screen flex-col bg-background" id="page" data-vaul-drawer-wrapper>
		<Header />

		{@render children()}
	</div>

<style>
</style>
