<script lang="ts">
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState, Text } from '@codemirror/state';
	import { LRLanguage } from '@codemirror/language';
	import { defaultKeymap, history, indentWithTab } from '@codemirror/commands';
	import { parser } from '$lib/grammar';
	import {
		drawSelection,
		highlightActiveLine,
		highlightSpecialChars,
		keymap,
		lineNumbers
	} from '@codemirror/view';
	import * as Resizable from '$lib/components/ui/resizable';
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { linter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';

	let { data }: PageProps = $props();
	let container = $state<HTMLElement>();
	// we are using a sandboxed iframe
	let previewContainer = $state<HTMLIFrameElement>();

	let view = $state.raw<EditorView>();

	$effect(() => {
		if (!view) return;
		const { errors } = data;
		const diagnostics: Diagnostic[] = errors
			? [
					{
						from: 0,
						to: view.state.doc.length,
						severity: 'error',
						message: errors,
						source: 'Vinum'
					}
				]
			: [];

		view.dispatch(setDiagnostics(view.state, diagnostics));
	});

	const compilePreview = debounce(async (doc: Text) => {
		const url = new URL(page.url);
		// TODO: put the document in a database
		// or at least compress it before throwing it in the URL
		url.searchParams.set('code', doc.toString());
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(url, {
			keepFocus: true,
			replaceState: true
		});
	}, 500);

	function debounce<Args extends unknown[]>(func: (...args: Args) => void, wait: number) {
		let timeout: number | undefined;
		return function (...args: Args) {
			clearTimeout(timeout);
			timeout = window.setTimeout(() => func(...args), wait);
		};
	}

	let isPrinting = $state(false);

	onMount(() => {
		const vinumLang = LRLanguage.define({
			parser,
			name: 'vinum'
		});

		view = new EditorView({
			parent: container,
			state: EditorState.create({
				doc: data.source,
				extensions: [
					basicSetup,
					vinumLang,
					keymap.of([indentWithTab, ...defaultKeymap]),
					history(),
					lineNumbers(),
					highlightSpecialChars(),
					highlightActiveLine(),
					drawSelection(),
					linter(null),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							compilePreview(update.state.doc);
						}
					}),
					EditorView.theme({
						'&': {
							height: 'var(--editor-height)'
						}
					})
				]
			})
		});

		return () => {
			view?.destroy();
		};
	});
</script>

<svelte:head>
	<title>Vinum editor</title>
</svelte:head>

<div class="pane-wrapper">

	<div class="flex justify-between items-center px-4 py-2 bg-muted/40 border-b">
		<span class="text-sm font-medium">Vinum Workspace</span>
		<form method="POST" 
				use:enhance={() => {
						isPrinting = true;
						return async ({ result, update }) => {
								isPrinting = false;
								
								// Make sure result.data exists and has our base64 'pdf' field
								if (result.type === 'success' && result.data?.pdf) {
										// 1. Fetch the Base64 data URI to automatically convert it to a valid Blob
										const res = await fetch(result.data.pdf as string);
										const blob = await res.blob();
										
										// 2. Trigger the browser download
										const url = window.URL.createObjectURL(blob);
										const a = document.createElement('a');
										a.href = url;
										a.download = 'document.pdf';
										document.body.appendChild(a);
										a.click();
										a.remove();
										window.URL.revokeObjectURL(url);
								}
								
								await update();
						};
				}}
		>
		<input type="hidden" name="html" value={data.compiled} />
		<button 
				type="submit" 
				disabled={isPrinting}
				class="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md shadow hover:bg-primary/90 disabled:opacity-50"
		>
				{isPrinting ? 'Generating PDF...' : 'Download PDF'}
		</button>
		</form>
	</div>


	<Resizable.PaneGroup direction="horizontal" autoSaveId="document-editor-panes">
		<Resizable.Pane defaultSize={50} class="h-full">
			<div bind:this={container}></div>
		</Resizable.Pane>
		<Resizable.Handle withHandle></Resizable.Handle>
		<Resizable.Pane defaultSize={50} class="h-full">
			<iframe
				bind:this={previewContainer}
				title="Vinum preview"
				class="preview"
				srcdoc={data.compiled}
				sandbox="allow-top-navigation allow-modals allow-pointer-lock allow-same-origin"
			></iframe>
		</Resizable.Pane>
	</Resizable.PaneGroup>
</div>

<style>
	.pane-wrapper {
		--editor-height: calc(100vh - var(--sticky-header-height));
		--editor-height: calc(100dvh - var(--sticky-header-height));
		height: var(--editor-height);
	}
	iframe {
		width: 100%;
		height: 100%;
	}
</style>
