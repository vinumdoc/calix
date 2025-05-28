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
	import { Pane, PaneGroup, PaneResizer } from 'paneforge';
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { linter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
	import { onMount } from 'svelte';

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

<PaneGroup direction="horizontal" autoSaveId="document-editor-panes">
	<Pane defaultSize={50}>
		<div>
			<div bind:this={container} class="editor"></div>
		</div>
	</Pane>
	<PaneResizer></PaneResizer>
	<Pane defaultSize={50}>
		<iframe
			bind:this={previewContainer}
			title="Vinum preview"
			class="preview"
			srcdoc={data.compiled}
			sandbox="allow-top-navigation allow-modals allow-pointer-lock allow-same-origin"
		></iframe>
	</Pane>
</PaneGroup>

<style>
	iframe {
		width: 100%;
		height: 100%;
	}
	.editor,
	:global(.cm-editor) {
		height: 80vh;
	}
</style>
