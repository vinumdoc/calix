<script lang="ts">
	import '../app.css';
	import Logo from '$lib/components/Logo.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import Header from '$lib/components/Header.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<!-- <ModeWatcher /> -->

<div class="relative flex min-h-screen flex-col bg-background" id="page" data-vaul-drawer-wrapper>
	<Header user={data.user} />

	{@render children()}
</div>

<style>
</style>
