<script lang="ts">
	import type { PageProps } from './$types';
	import PageSidebar from './sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Resizable from '$lib/components/ui/resizable';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState } from '@codemirror/state';
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
	import { linter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
	import { onMount, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import { type ProjectDirectory, type ProjectTree } from './tree';
	import type { VinumDocument } from '$lib/server/db/schema';

	let { data }: PageProps = $props();

	// State
	let selectedPath = $state<string | null>(
		data.documents.length > 0 ? data.documents[0].relativePath : null
	);
	let container = $state<HTMLElement>();
	let previewContainer = $state<HTMLIFrameElement>();
	let view = $state.raw<EditorView>();
	let compiled = $state('');
	let compilationError = $state<string | null>(null);
	let isSaving = $state(false);

	// File content cache (to store unsaved changes in memory)
	let fileContents = $state<Record<string, string>>({});

	// Derived tree for sidebar
	let tree = $derived(buildTree(data.documents));
	let directory = $derived(getProjectDirectory(tree, 'root'));

	async function handleCreateFile(path: string) {
		const formData = new FormData();
		formData.append('relativePath', path);

		const response = await fetch('?/createFile', {
			method: 'POST',
			body: formData
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			await invalidateAll();
			selectedPath = path;
		}
	}

	async function handleDeleteFile(path: string) {
		const formData = new FormData();
		formData.append('relativePath', path);

		const response = await fetch('?/deleteFile', {
			method: 'POST',
			body: formData
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			await invalidateAll();
			if (selectedPath === path) {
				selectedPath = null;
			}
		}
	}

	function buildTree(documents: VinumDocument[]): ProjectTree {
		const root: ProjectTree = { files: {}, children: {} };

		for (const doc of documents) {
			const parts = doc.relativePath.split('/');
			let parent = root;

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				if (i === parts.length - 1) {
					parent.files[part] = doc;
					continue;
				}

				if (!parent.children[part]) {
					parent.children[part] = { files: {}, children: {} };
				}
				parent = parent.children[part];
			}
		}

		return root;
	}

	function getProjectDirectory(tree: ProjectTree, name: string): ProjectDirectory {
		const dir: ProjectDirectory = {
			type: 'directory',
			name,
			children: []
		};

		for (const [childName, childDir] of Object.entries(tree.children)) {
			dir.children.push(getProjectDirectory(childDir, childName));
		}

		for (const [fileName, doc] of Object.entries(tree.files)) {
			dir.children.push({ name: fileName, doc, type: 'file' });
		}

		dir.children.sort((a, b) => {
			if (a.type === b.type) {
				return a.name.localeCompare(b.name);
			}

			return a.type === 'directory' ? -1 : 1;
		});

		return dir;
	}

	function getFileContent(path: string) {
		if (path in fileContents) return fileContents[path];
		const doc = data.documents.find((d) => d.relativePath === path);
		return doc ? doc.body : '';
	}

	const compile = debounce(async (code: string) => {
		try {
			const response = await fetch('/api/compile', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});
			const result = await response.json();
			compiled = result.compiled;
			compilationError = result.errors;

			if (view) {
				const diagnostics: Diagnostic[] = result.errors
					? [
							{
								from: 0,
								to: view.state.doc.length,
								severity: 'error',
								message: result.errors,
								source: 'Vinum'
							}
						]
					: [];
				view.dispatch(setDiagnostics(view.state, diagnostics));
			}
		} catch (e) {
			console.error('Compilation failed', e);
		}
	}, 500);

	const saveFile = debounce(async (path: string, content: string) => {
		isSaving = true;
		try {
			const formData = new FormData();
			formData.append('relativePath', path);
			formData.append('content', content);

			await fetch('?/saveFile', {
				method: 'POST',
				body: formData
			});
		} catch (e) {
			console.error('Save failed', e);
		} finally {
			isSaving = false;
		}
	}, 1000);

	function debounce<Args extends unknown[]>(func: (...args: Args) => void, wait: number) {
		let timeout: number | undefined;
		return function (...args: Args) {
			clearTimeout(timeout);
			timeout = window.setTimeout(() => func(...args), wait);
		};
	}

	const vinumLang = LRLanguage.define({
		parser,
		name: 'vinum'
	});

	function createEditorState(doc: string) {
		return EditorState.create({
			doc,
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
					if (update.docChanged && selectedPath) {
						const newDoc = update.state.doc.toString();
						fileContents[selectedPath] = newDoc;
						compile(newDoc);
						saveFile(selectedPath, newDoc);
					}
				}),
				EditorView.theme({
					'&': {
						height: '100%'
					}
				})
			]
		});
	}

	onMount(() => {
		if (!container) return;
		view = new EditorView({
			parent: container
		});

		return () => {
			view?.destroy();
		};
	});

	$effect(() => {
		const path = selectedPath;
		const editorView = view;
		if (!path || !editorView) return;

		untrack(() => {
			const content = getFileContent(path);
			const newState = createEditorState(content);
			console.log('Loading file into editor:', selectedPath);
			editorView.setState(newState);
			compile(content); // Initial compile for the file
		});
	});
</script>

<Sidebar.Provider>
	<PageSidebar
		root={directory}
		activeFile={selectedPath}
		onSelect={(path) => (selectedPath = path)}
		onCreateFile={handleCreateFile}
		onDeleteFile={handleDeleteFile}
	/>
	<Sidebar.Inset>
		<header class="flex h-12 shrink-0 items-center gap-2 border-b px-4">
			<Sidebar.Trigger class="-ms-1" />
			<div class="flex items-center gap-2 font-medium">
				{selectedPath || 'No file selected'}
				{#if isSaving}
					<span class="text-xs font-normal text-muted-foreground">Saving...</span>
				{/if}
			</div>
		</header>
		<div class="flex-1 overflow-hidden p-4">
			<Resizable.PaneGroup direction="horizontal" autoSaveId="project-editor-panes">
				<Resizable.Pane defaultSize={50} class="h-full overflow-hidden rounded-l-md border">
					<div bind:this={container} class="h-full"></div>
				</Resizable.Pane>
				<Resizable.Handle withHandle />
				<Resizable.Pane
					defaultSize={50}
					class="h-full overflow-hidden rounded-r-md border bg-white"
				>
					<iframe
						bind:this={previewContainer}
						title="Vinum preview"
						class="h-full w-full"
						srcdoc={compiled}
						sandbox="allow-top-navigation allow-modals allow-pointer-lock allow-same-origin"
					></iframe>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
