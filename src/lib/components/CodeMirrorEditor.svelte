<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		EditorView,
		keymap,
		lineNumbers,
		highlightActiveLineGutter,
		highlightSpecialChars,
		drawSelection,
		dropCursor,
		rectangularSelection,
		crosshairCursor,
		highlightActiveLine
	} from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import {
		LRLanguage,
		LanguageSupport,
		syntaxHighlighting,
		defaultHighlightStyle,
		foldGutter,
		indentOnInput,
		bracketMatching
	} from '@codemirror/language';
	import { closeBrackets } from '@codemirror/autocomplete';
	import { parser } from '$lib/grammar';

	import * as Y from 'yjs';
	import { WebsocketProvider } from 'y-websocket';
	import { yCollab } from 'y-codemirror.next';
	import { env } from '$env/dynamic/public';

	let {
		initialValue = '',
		onchange = () => {},
		yjsRoom = '',
		userName = 'User',
		userColor = '#3080f0',
		readOnly = false,
		wsUrl = env.PUBLIC_YJS_WS_URL || 'ws://localhost:1234'
	}: {
		initialValue?: string;
		onchange?: (val: string) => void;
		yjsRoom?: string;
		userName?: string;
		userColor?: string;
		readOnly?: boolean;
		wsUrl?: string;
	} = $props();

	let container = $state<HTMLDivElement | null>(null);
	let view: EditorView | null = null;
	let provider: WebsocketProvider | null = null;
	let ydoc: Y.Doc | null = null;
	let ytext: Y.Text | null = null;

	// Programmatically set editor text when active file changes
	export function setValue(newText: string) {
		if (view) {
			const currentText = view.state.doc.toString();
			if (currentText !== newText) {
				view.dispatch({
					changes: { from: 0, to: view.state.doc.length, insert: newText }
				});
			}
		}
	}

	// Programmatically get current editor text
	export function getValue(): string {
		return view ? view.state.doc.toString() : initialValue;
	}

	// Create custom Vinum language extension for CodeMirror
	const vinumLanguage = LRLanguage.define({
		parser: parser
	});

	function vinum() {
		return new LanguageSupport(vinumLanguage);
	}

	onMount(() => {
		if (!container) return;

		const extensions = [
			lineNumbers(),
			highlightActiveLineGutter(),
			highlightSpecialChars(),
			history(),
			foldGutter(),
			drawSelection(),
			dropCursor(),
			EditorState.allowMultipleSelections.of(true),
			indentOnInput(),
			syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
			bracketMatching(),
			closeBrackets(),
			rectangularSelection(),
			crosshairCursor(),
			highlightActiveLine(),
			keymap.of([...defaultKeymap, ...historyKeymap]),
			vinum(),
			EditorView.lineWrapping,
			EditorState.readOnly.of(readOnly),
			EditorView.theme({
				'&': {
					height: '100%',
					fontSize: '14px',
					backgroundColor: 'transparent'
				},
				'.cm-content': {
					fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
					padding: '12px 0'
				},
				'.cm-gutters': {
					backgroundColor: 'var(--muted)',
					color: 'var(--muted-foreground)',
					borderRight: '1px solid var(--border)'
				},
				'&.cm-focused': {
					outline: 'none'
				}
			}),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					const docText = update.state.doc.toString();
					onchange(docText);
				}
			})
		];

		// Connect Yjs CRDT real-time sync if room is provided AND editor is not read-only
		if (yjsRoom && !readOnly) {
			try {
				ydoc = new Y.Doc();
				provider = new WebsocketProvider(wsUrl, yjsRoom, ydoc, { connect: true });
				ytext = ydoc.getText('codemirror');

				provider.awareness.setLocalStateField('user', {
					name: userName,
					color: userColor
				});

				// Populate initial text if Yjs text is empty
				if (ytext.length === 0 && initialValue) {
					ytext.insert(0, initialValue);
				}

				ytext.observe(() => {
					if (ytext) {
						onchange(ytext.toString());
					}
				});

				provider.on('synced', () => {
					if (ytext) {
						onchange(ytext.toString());
					}
				});

				extensions.push(yCollab(ytext, provider.awareness));
			} catch (err) {
				console.warn('Yjs WebSocket connection failed, falling back to local editing:', err);
			}
		}

		const startState = EditorState.create({
			doc: initialValue,
			extensions
		});

		view = new EditorView({
			state: startState,
			parent: container
		});

		// Initial notification to parent to compile preview
		onchange(initialValue);
	});

	onDestroy(() => {
		if (provider) {
			provider.destroy();
		}
		if (ydoc) {
			ydoc.destroy();
		}
		if (view) {
			view.destroy();
		}
	});
</script>

<div
	bind:this={container}
	class="h-full min-h-[300px] w-full overflow-hidden rounded-md border bg-background"
></div>
