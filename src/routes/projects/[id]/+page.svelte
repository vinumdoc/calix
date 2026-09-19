<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		getProjectWithFiles,
		saveFileContent,
		deleteFile,
		renameFile,
		updatePublicAccessLevel,
		inviteCollaborator,
		removeCollaborator,
		updateProjectEntryFile,
		updateProjectDetails
	} from '$lib/remotes/projects.remote';
	import { invalidateAll } from '$app/navigation';
	import { compileDoc } from '$lib/remotes/compile.remote';
	import JSZip from 'jszip';
	import CodeMirrorEditor from '$lib/components/CodeMirrorEditor.svelte';
	import Resizable from '$lib/components/Resizable.svelte';
	import {
		FileCode,
		Plus,
		Trash2,
		Download,
		Share2,
		Upload,
		Image as ImageIcon,
		Eye,
		Code,
		Play,
		CheckCircle2,
		MoreVertical,
		Edit,
		Copy,
		FolderOutput,
		Archive,
		Bookmark,
		BookmarkCheck,
		Settings
	} from '@lucide/svelte';

	type ProjectFile = (typeof data)['files'][number];

	let { data } = $props();

	let files = $derived(
		(data.files || []).slice().sort((a, b) => a.relativePath.localeCompare(b.relativePath))
	);
	let sourceFiles = $derived(files.filter((f) => !f.relativePath.startsWith('cocktail/')));
	let cocktailFiles = $derived(files.filter((f) => f.relativePath.startsWith('cocktail/')));

	let activeFilePath = $state(data.project.entryFilePath);
	let activeContent = $state('');
	let compiledHtml = $state('');
	let compileErrors = $state('');
	let isCompiling = $state(false);
	let isPrinting = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	let newFileName = $state('');
	let showNewFileModal = $state(false);
	let showShareModal = $state(false);
	let showSettingsModal = $state(false);
	let settingsName = $state(data.project.name);
	let settingsDescription = $state(data.project.description || '');
	let settingsEntryFile = $state(data.project.entryFilePath);
	let isSavingSettings = $state(false);
	let settingsError = $state('');
	let settingsSuccess = $state('');

	let uploadFileInput = $state<HTMLInputElement | null>(null);
	let copiedLink = $state(false);
	let activeTab = $state<'split' | 'code' | 'preview'>('split');

	let editorRef = $state<CodeMirrorEditor | null>(null);

	let openMenuId = $state<string | null>(null);

	let showRenameModal = $state(false);
	let fileToRename = $state('');
	let renameInput = $state('');

	function closeMenu() {
		openMenuId = null;
	}

	function selectFile(path: string) {
		activeFilePath = path;
		const file = files.find((f) => f.relativePath === path);
		if (file && !file.isBinary) {
			activeContent = file.body;
			editorRef?.setValue(file.body);
			triggerDebouncedCompile();
		}
	}

	function handleCodeChange(newCode: string) {
		activeContent = newCode;

		const file = files.find((f) => f.relativePath === activeFilePath);
		if (file && !file.isBinary) {
			file.body = activeContent;
		}
		triggerDebouncedCompile();
	}

	function triggerDebouncedCompile() {
		if (debounceTimer) clearTimeout(debounceTimer);
		isCompiling = true;

		debounceTimer = setTimeout(async () => {
			try {
				await saveFileContent({
					projectId: data.project.id,
					relativePath: activeFilePath,
					body: activeContent
				});

				const res = await compileDoc(data.project.id);
				compiledHtml = res.compiled;
				compileErrors = res.errors || '';
			} catch (err) {
				compileErrors = (err as Error).message || 'Compilation error';
			} finally {
				isCompiling = false;
			}
		}, 350); // 350ms debounce
	}

	async function handleCreateFile(e: Event) {
		e.preventDefault();
		if (!newFileName.trim()) return;

		const path = newFileName.trim().endsWith('.vin')
			? newFileName.trim()
			: `${newFileName.trim()}.vin`;

		await saveFileContent({
			projectId: data.project.id,
			relativePath: path,
			body: `[paragraph: New file ${path}]`
		});

		newFileName = '';
		showNewFileModal = false;
		activeFilePath = path;

		await invalidateAll();
	}

	async function handleDeleteFile(path: string) {
		if (path === data.project.entryFilePath) {
			alert('Cannot delete the main entry file. Please set another file as the entry file first.');
			return;
		}
		if (confirm(`Delete file "${path}"?`)) {
			await deleteFile({ projectId: data.project.id, relativePath: path });
			if (activeFilePath === path) {
				activeFilePath = data.project.entryFilePath;
			}
		}

		await invalidateAll();
	}

	async function handleSetEntryFile(path: string) {
		try {
			await updateProjectEntryFile({
				projectId: data.project.id,
				entryFilePath: path
			});
			openMenuId = null;
			await invalidateAll();
		} catch (err: any) {
			alert(err?.message || 'Failed to update entry file.');
		}
	}

	function openSettingsModal() {
		settingsName = data.project.name;
		settingsDescription = data.project.description || '';
		settingsEntryFile = data.project.entryFilePath;
		settingsError = '';
		settingsSuccess = '';
		showSettingsModal = true;
	}

	async function handleSaveProjectSettings(e: Event) {
		e.preventDefault();
		if (!settingsName.trim()) return;

		isSavingSettings = true;
		settingsError = '';
		settingsSuccess = '';

		try {
			await updateProjectDetails({
				projectId: data.project.id,
				name: settingsName.trim(),
				description: settingsDescription.trim(),
				entryFilePath: settingsEntryFile
			});
			settingsSuccess = 'Settings saved successfully!';
			await invalidateAll();
			setTimeout(() => {
				showSettingsModal = false;
				settingsSuccess = '';
			}, 600);
		} catch (err: any) {
			settingsError = err?.message || 'Failed to update project settings.';
		} finally {
			isSavingSettings = false;
		}
	}

	async function submitRename(e: Event) {
		e.preventDefault();
		if (!renameInput.trim() || !fileToRename) return;

		const formattedName = renameInput.trim().endsWith('.vin')
			? renameInput.trim()
			: `${renameInput.trim()}.vin`;

		const isCocktail = fileToRename.startsWith('cocktail/');
		const newPath = isCocktail ? `cocktail/${formattedName}` : formattedName;

		if (newPath === fileToRename) {
			showRenameModal = false;
			return;
		}

		const res = await renameFile({
			projectId: data.project.id,
			oldPath: fileToRename,
			newPath: newPath
		});

		if (res.success) {
			if (activeFilePath === fileToRename) {
				activeFilePath = newPath;
			}

			showRenameModal = false;
			fileToRename = '';
			renameInput = '';
		}
		await invalidateAll();
	}

	async function toggleCocktailStatus(file: ProjectFile) {
		const isCocktail = file.relativePath.startsWith('cocktail/');
		const oldPath = file.relativePath;

		const newPath = isCocktail ? oldPath.replace('cocktail/', '') : `cocktail/${oldPath}`;

		const res = await renameFile({
			projectId: data.project.id,
			oldPath,
			newPath
		});

		if (res.success) {
			await invalidateAll();
			if (activeFilePath === oldPath) {
				activeFilePath = newPath;
			}
			openMenuId = null;
		}
	}

	function downloadSingleFile(file: ProjectFile) {
		const blob = new Blob([file.body], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = file.relativePath;
		document.body.appendChild(a);
		a.click();

		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function downloadProjectZip() {
		const zip = new JSZip();

		for (const file of files) {
			zip.file(file.relativePath, file.body);
		}

		const content = await zip.generateAsync({ type: 'blob' });

		const url = URL.createObjectURL(content);
		const a = document.createElement('a');
		a.href = url;

		const safeProjectName =
			data.project?.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'project';
		a.download = `${safeProjectName}-source.zip`;

		document.body.appendChild(a);
		a.click();

		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function handleAssetUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append('file', file);
		formData.append('path', `images/${file.name}`);

		await fetch(`/api/projects/${data.project.id}/files/upload`, {
			method: 'POST',
			body: formData
		});

		if (uploadFileInput) uploadFileInput.value = '';
	}

	let publicAccess = $state(data.project.publicAccessLevel || 'none');
	let inviteEmail = $state('');
	let inviteRole = $state<'read' | 'edit'>('edit');
	let inviteError = $state('');
	let inviteSuccess = $state('');
	let inviting = $state(false);

	async function handleAccessLevelChange(newLevel: 'none' | 'read' | 'edit') {
		publicAccess = newLevel;
		await updatePublicAccessLevel({
			projectId: data.project.id,
			publicAccessLevel: newLevel
		});
		await invalidateAll();
	}

	async function handleInvite(e: Event) {
		e.preventDefault();
		if (!inviteEmail.trim()) return;

		inviting = true;
		inviteError = '';
		inviteSuccess = '';

		const res = await inviteCollaborator({
			projectId: data.project.id,
			email: inviteEmail.trim(),
			role: inviteRole
		});

		if (res.success) {
			inviteSuccess = 'Collaborator invited successfully!';
			inviteEmail = '';
			await invalidateAll();
		} else {
			inviteError = res.error || 'Failed to invite user.';
		}
		inviting = false;
	}

	async function handleRemoveCollaborator(userId: string) {
		await removeCollaborator({
			projectId: data.project.id,
			userId
		});
		await invalidateAll();
	}

	// Share Link
	function copyShareLink() {
		const link = `${window.location.origin}/projects/${data.project.id}`;
		navigator.clipboard.writeText(link);
		copiedLink = true;
		setTimeout(() => (copiedLink = false), 2000);
	}

	async function downloadPdf() {
		try {
			isPrinting = true;

			const res = await fetch('/api/export-pdf', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					html: compiledHtml,
					title: data.project?.name
				})
			});

			if (!res.ok) throw new Error('Generation failed');

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = `${data.project?.name || 'document'}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();

			URL.revokeObjectURL(url);
		} catch (err) {
			console.error(err);
		} finally {
			isPrinting = false;
		}
	}
</script>

<svelte:window onclick={closeMenu} />

<div class="flex h-[calc(100vh-4rem)] flex-col bg-background">
	{#snippet fileItem(file: ProjectFile)}
		{@const isEntry = file.relativePath === data.project.entryFilePath}
		<div
			class="group flex w-full items-center justify-between rounded-md px-2.5 py-1 text-xs font-medium transition-colors {activeFilePath ===
			file.relativePath
				? 'bg-primary/10 font-semibold text-primary'
				: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
		>
			<button
				type="button"
				class="flex flex-1 min-w-0 items-center gap-2 truncate text-left cursor-pointer py-0.5"
				onclick={() => {
					if (!file.isBinary) selectFile(file.relativePath);
				}}
			>
				{#if file.isBinary}
					<ImageIcon class="h-3.5 w-3.5 shrink-0 text-blue-500" />
				{:else if isEntry}
					<Bookmark class="h-3.5 w-3.5 shrink-0 text-amber-500" />
				{:else}
					<FileCode class="h-3.5 w-3.5 shrink-0 text-amber-500" />
				{/if}
				<span class="truncate">{file.relativePath.replace('cocktail/', '')}</span>
				{#if isEntry}
					<span
						class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0"
						title="Entry Document"
					>
						Entry
					</span>
				{/if}
			</button>

			<div class="relative flex items-center shrink-0">
				<button
					type="button"
					class="p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground cursor-pointer"
					onclick={(e) => {
						e.stopPropagation();
						openMenuId = openMenuId === file.id ? null : file.id;
					}}
					title="Options"
				>
					<MoreVertical class="h-4 w-4" />
				</button>

				{#if openMenuId === file.id}
					<div
						class="absolute top-full right-0 z-50 mt-1 flex w-44 flex-col overflow-hidden rounded-md border bg-background shadow-md"
					>
						<!-- Entry File Action -->
						{#if isEntry}
							<div class="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10">
								<BookmarkCheck class="h-3.5 w-3.5 shrink-0" />
								Active Entry File
							</div>
						{:else if !file.relativePath.startsWith('cocktail/') && !file.isBinary && data.canEdit}
							<button
								type="button"
								class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer text-left"
								onclick={(e) => {
									e.stopPropagation();
									handleSetEntryFile(file.relativePath);
								}}
							>
								<BookmarkCheck class="h-3.5 w-3.5 text-amber-500" />
								Set as Entry File
							</button>
						{/if}

						<!-- Move to Source/Cocktail (Only allowed for non-entry files) -->
						{#if !isEntry}
							<button
								type="button"
								class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer text-left"
								onclick={(e) => {
									e.stopPropagation();
									toggleCocktailStatus(file);
								}}
							>
								<FolderOutput class="h-3.5 w-3.5" />
								{file.relativePath.startsWith('cocktail/') ? 'Move to Source' : 'Move to Cocktail'}
							</button>
						{/if}

						<!-- Rename -->
						<button
							type="button"
							class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer text-left"
							onclick={(e) => {
								e.stopPropagation();
								fileToRename = file.relativePath;
								renameInput = file.relativePath.replace('cocktail/', '');
								showRenameModal = true;
								openMenuId = null;
							}}
						>
							<Edit class="h-3.5 w-3.5" />
							Rename
						</button>

						<button
							type="button"
							class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer text-left"
							onclick={(e) => {
								e.stopPropagation();
								downloadSingleFile(file);
								openMenuId = null;
							}}
						>
							<Download class="h-3.5 w-3.5" />
							Download
						</button>

						<div class="h-px w-full bg-border"></div>

						{#if isEntry}
							<div
								class="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground/50"
								title="Cannot delete active entry file. Set another file as entry file first."
							>
								<Trash2 class="h-3.5 w-3.5" />
								Delete
							</div>
						{:else}
							<button
								type="button"
								class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-muted cursor-pointer text-left"
								onclick={(e) => {
									e.stopPropagation();
									handleDeleteFile(file.relativePath);
									openMenuId = null;
								}}
							>
								<Trash2 class="h-3.5 w-3.5" />
								Delete
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/snippet}

	<!-- IDE Toolbar -->
	<header class="flex h-14 items-center justify-between border-b bg-muted/40 px-4">
		<div class="flex items-center gap-3">
			<a
				href={resolve('/projects')}
				class="text-sm font-medium text-muted-foreground hover:text-foreground"
			>
				← Projects
			</a>
			<span class="text-muted-foreground">/</span>
			<h2 class="text-base font-semibold">{data.project?.name || 'Loading...'}</h2>
			{#if isCompiling}
				<span class="flex items-center gap-1.5 text-xs font-medium text-amber-500">
					<span class="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
					Compiling...
				</span>
			{:else}
				<span class="flex items-center gap-1.5 text-xs font-medium text-green-500">
					<span class="h-2 w-2 rounded-full bg-green-500"></span>
					Ready
				</span>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2">
			<!-- Mobile View Switcher -->
			<div class="flex rounded-lg border bg-background p-1 md:hidden">
				<button
					class="rounded px-2 py-1 text-xs {activeTab === 'code'
						? 'bg-primary text-primary-foreground'
						: ''}"
					onclick={() => (activeTab = 'code')}
				>
					Code
				</button>
				<button
					class="rounded px-2 py-1 text-xs {activeTab === 'preview'
						? 'bg-primary text-primary-foreground'
						: ''}"
					onclick={() => (activeTab = 'preview')}
				>
					Preview
				</button>
			</div>

			<Button variant="outline" size="sm" onclick={openSettingsModal} class="gap-1.5">
				<Settings class="h-4 w-4" />
				Settings
			</Button>

			<Button variant="outline" size="sm" onclick={() => (showShareModal = true)} class="gap-1.5">
				<Share2 class="h-4 w-4" />
				Share
			</Button>
			<Button variant="outline" size="sm" onclick={downloadProjectZip} class="gap-1.5">
				<Archive class="h-4 w-4" />
				Download Source
			</Button>

			<Button disabled={isPrinting} onclick={downloadPdf} size="sm" class="gap-1.5">
				{isPrinting ? 'Generating PDF...' : 'Export to PDF'}
			</Button>
		</div>
	</header>

	<!-- Main Workspace Split Pane -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar: File Tree & Assets -->
		<Resizable resizableTop={false} resizableLeft={false} resizableBottom={false}>
			<aside class="hidden h-full flex-col overflow-hidden border-r bg-muted/20 md:flex">
				<div class="flex flex-1 flex-col overflow-hidden">
					<!-- Source Files -->
					<div class="flex flex-1 flex-col overflow-hidden p-3">
						<div class="mb-3 flex shrink-0 items-center justify-between">
							<span class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
								>Source Files</span
							>
							<div class="flex gap-1">
								<button
									class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
									onclick={() => (showNewFileModal = true)}
								>
									<Plus class="h-4 w-4" />
								</button>
								<button
									class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
									onclick={() => uploadFileInput?.click()}
								>
									<Upload class="h-4 w-4" />
								</button>
								<input
									type="file"
									bind:this={uploadFileInput}
									class="hidden"
									onchange={handleAssetUpload}
								/>
							</div>
						</div>

						<nav class="flex-1 space-y-1 overflow-y-auto pr-1">
							{#each sourceFiles as file (file.id)}
								{@render fileItem(file)}
							{/each}
						</nav>
					</div>

					<!-- Cocktail Files -->
					{#if cocktailFiles.length > 0}
						<Resizable resizableRight={false} resizableLeft={false} resizableBottom={false}>
							<div
								class="flex h-full w-full flex-1 flex-col overflow-hidden border-t bg-muted/10 p-3"
							>
								<div class="mb-3 flex shrink-0 items-center justify-between">
									<span class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
										>Cocktail Files</span
									>
								</div>

								<nav class="flex-1 space-y-1 overflow-y-auto pr-1">
									{#each cocktailFiles as file (file.id)}
										{@render fileItem(file)}
									{/each}
								</nav>
							</div>
						</Resizable>
					{/if}
				</div>
			</aside>
		</Resizable>

		<!-- Center Code Editor Pane -->
		<Resizable
			resizableTop={false}
			resizableLeft={false}
			resizableBottom={false}
			initialWidth="40%"
			initialHeight="100%"
		>
			<div
				class="flex h-full flex-1 flex-col border-r bg-background {activeTab === 'preview'
					? 'hidden md:flex'
					: 'flex'}"
			>
				<div
					class="flex h-9 items-center justify-between border-b bg-muted/10 px-4 font-mono text-xs"
				>
					<span>{activeFilePath}</span>
					<span class="text-muted-foreground">{activeContent.length} chars</span>
				</div>
				<div class="flex-1 overflow-y-auto p-2">
					<CodeMirrorEditor
						bind:this={editorRef}
						initialValue={activeContent}
						onchange={handleCodeChange}
						yjsRoom={`${data.project.id}__${activeFilePath}`}
						userName={data.user?.name || 'Guest Editor'}
						readOnly={!data.canEdit}
					/>
				</div>
			</div>
		</Resizable>

		<!-- Right Live HTML Preview Pane -->
		<div
			class="flex flex-1 flex-col bg-background {activeTab === 'code' ? 'hidden md:flex' : 'flex'}"
		>
			<div
				class="flex h-9 items-center justify-between border-b bg-muted/10 px-4 text-xs font-medium"
			>
				<span class="flex items-center gap-1.5">
					<Eye class="h-3.5 w-3.5 text-primary" />
					Live HTML Preview
				</span>
			</div>
			<div class="relative flex-1 overflow-hidden bg-white">
				{#if compileErrors}
					<div
						class="absolute right-4 bottom-4 z-20 max-w-md rounded-xl border border-zinc-400/40 bg-popover p-4 dark:border-zinc-700"
					>
						<div class="mb-2 flex items-center justify-between border-b border-border pb-2">
							<span class="flex items-center gap-2 text-xs font-semibold text-destructive">
								<span class="h-2 w-2 rounded-full bg-destructive"></span>
								Compilation Error
							</span>
						</div>
						<div class="rounded-lg border border-border/50 bg-muted/60 p-2.5">
							<pre
								class="max-h-32 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-foreground">{compileErrors}</pre>
						</div>
					</div>
				{/if}

				<iframe
					title="Vinum Document Preview"
					class="h-full w-full border-0 bg-white"
					sandbox=""
					srcdoc={compiledHtml || ''}
				></iframe>
			</div>
		</div>
	</div>

	<!-- New File Modal -->
	{#if showNewFileModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div class="w-full max-w-sm space-y-4 rounded-xl border bg-background p-6 shadow-xl">
				<h3 class="text-lg font-bold">New Vinum File</h3>
				<form onsubmit={handleCreateFile} class="space-y-4">
					<Input placeholder="e.g. section1.vin" bind:value={newFileName} required />
					<div class="flex justify-end gap-2">
						<Button type="button" variant="outline" onclick={() => (showNewFileModal = false)}>
							Cancel
						</Button>
						<Button type="submit">Create</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Rename File Modal -->
	{#if showRenameModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div class="w-full max-w-sm space-y-4 rounded-xl border bg-background p-6 shadow-xl">
				<h3 class="text-lg font-bold">Rename File</h3>
				<form onsubmit={submitRename} class="space-y-4">
					<Input placeholder="e.g. new_name.vin" bind:value={renameInput} required />
					<div class="flex justify-end gap-2">
						<Button type="button" variant="outline" onclick={() => (showRenameModal = false)}>
							Cancel
						</Button>
						<Button type="submit">Rename</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Share Project Modal -->
	{#if showShareModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div
				class="max-h-[90vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-xl border bg-background p-6 shadow-xl"
			>
				<div class="flex items-center justify-between border-b pb-3">
					<h3 class="text-lg font-bold">Share "{data.project.name}"</h3>
					<button
						class="text-muted-foreground hover:text-foreground"
						onclick={() => (showShareModal = false)}
					>
						✕
					</button>
				</div>

				<!-- Link Sharing & Access Control -->
				<div class="space-y-3">
					<span class="block text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>General Access</span
					>
					<div class="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-3">
						<div class="space-y-0.5">
							<p class="text-sm font-medium">Link Permission</p>
							<p class="text-xs text-muted-foreground">
								Control who can access this project via URL.
							</p>
						</div>
						{#if data.isOwner}
							<select
								class="rounded-md border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none"
								value={publicAccess}
								onchange={(e) =>
									handleAccessLevelChange((e.target as HTMLSelectElement).value as any)}
							>
								<option value="none">🔒 Private (Only Invited)</option>
								<option value="read">👁️ Anyone with link can view</option>
								<option value="edit">✏️ Anyone with link can edit</option>
							</select>
						{:else}
							<span
								class="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary capitalize"
							>
								{publicAccess}
							</span>
						{/if}
					</div>

					<div class="flex gap-2">
						<Input
							value={`${window.location.origin}/projects/${data.project.id}`}
							readonly
							class="font-mono text-xs"
						/>
						<Button onclick={copyShareLink} class="shrink-0 gap-1.5" size="sm">
							{#if copiedLink}
								<CheckCircle2 class="h-4 w-4 text-green-400" />
								Copied Link
							{:else}
								<Copy class="h-4 w-4" />
								Copy Link
							{/if}
						</Button>
					</div>
				</div>

				<!-- Direct Email Invites (Owner only) -->
				{#if data.isOwner}
					<div class="space-y-3 border-t pt-4">
						<span class="block text-xs font-semibold tracking-wider text-muted-foreground uppercase"
							>Invite Collaborator</span
						>
						<form onsubmit={handleInvite} class="flex gap-2">
							<Input
								type="email"
								placeholder="colleague@example.com"
								bind:value={inviteEmail}
								required
								class="flex-1 text-xs"
							/>
							<select
								class="rounded-md border bg-background px-2 py-1.5 text-xs font-medium"
								bind:value={inviteRole}
							>
								<option value="edit">Editor</option>
								<option value="read">Viewer</option>
							</select>
							<Button type="submit" size="sm" disabled={inviting}>
								{inviting ? 'Inviting...' : 'Invite'}
							</Button>
						</form>

						{#if inviteError}
							<p class="text-xs font-medium text-destructive">{inviteError}</p>
						{/if}
						{#if inviteSuccess}
							<p class="text-xs font-medium text-green-600 dark:text-green-400">{inviteSuccess}</p>
						{/if}
					</div>
				{/if}

				<!-- Collaborators List -->
				<div class="space-y-3 border-t pt-4">
					<span class="block text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>People with Access</span
					>
					<div class="space-y-2">
						<!-- Owner -->
						<div class="flex items-center justify-between rounded bg-muted/30 p-2 text-xs">
							<div>
								<p class="font-semibold">{data.user?.name || 'Owner'}</p>
								<p class="text-muted-foreground">{data.user?.email}</p>
							</div>
							<span
								class="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400"
							>
								Owner
							</span>
						</div>

						<!-- Invited Collaborators -->
						{#each data.collaborators || [] as col (col.id)}
							<div class="flex items-center justify-between rounded border p-2 text-xs">
								<div>
									<p class="font-semibold">{col.name}</p>
									<p class="text-muted-foreground">{col.email}</p>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-muted-foreground capitalize">{col.role}</span>
									{#if data.isOwner}
										<button
											class="p-1 text-muted-foreground hover:text-destructive"
											title="Remove Access"
											onclick={() => handleRemoveCollaborator(col.userId)}
										>
											<Trash2 class="h-3.5 w-3.5" />
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Project Settings Modal -->
	{#if showSettingsModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div class="w-full max-w-md space-y-5 rounded-xl border bg-background p-6 shadow-xl">
				<div class="flex items-center justify-between border-b pb-3">
					<h3 class="text-lg font-bold">Project Settings</h3>
					<button
						class="text-muted-foreground hover:text-foreground cursor-pointer"
						onclick={() => (showSettingsModal = false)}
					>
						✕
					</button>
				</div>

				<form onsubmit={handleSaveProjectSettings} class="space-y-4">
					<div class="space-y-1.5">
						<label for="settingsName" class="text-xs font-semibold text-muted-foreground uppercase">
							Project Name
						</label>
						<Input id="settingsName" bind:value={settingsName} required disabled={!data.canEdit} />
					</div>

					<div class="space-y-1.5">
						<label for="settingsDesc" class="text-xs font-semibold text-muted-foreground uppercase">
							Description
						</label>
						<Input id="settingsDesc" placeholder="Brief summary of document" bind:value={settingsDescription} disabled={!data.canEdit} />
					</div>

					<div class="space-y-1.5">
						<label for="settingsEntryFile" class="text-xs font-semibold text-muted-foreground uppercase">
							Entry Document
						</label>
						{#if data.canEdit}
							<select
								id="settingsEntryFile"
								class="w-full rounded-md border bg-background px-3 py-2 text-xs font-medium focus:outline-none"
								bind:value={settingsEntryFile}
							>
								{#each sourceFiles.filter((f) => !f.isBinary) as file (file.id)}
									<option value={file.relativePath}>
										{file.relativePath} {file.relativePath === data.project.entryFilePath ? '(Current Entry)' : ''}
									</option>
								{/each}
							</select>
						{:else}
							<Input id="settingsEntryFile" value={settingsEntryFile} readonly class="bg-muted font-mono text-xs" />
						{/if}
						<p class="text-[11px] text-muted-foreground">
							The root Vinum document compiled when generating PDF exports and live previews.
						</p>
					</div>

					{#if settingsError}
						<p class="text-xs font-medium text-destructive">{settingsError}</p>
					{/if}
					{#if settingsSuccess}
						<p class="text-xs font-medium text-green-600 dark:text-green-400">{settingsSuccess}</p>
					{/if}

					<div class="flex justify-end gap-2 border-t pt-3">
						<Button type="button" variant="outline" onclick={() => (showSettingsModal = false)}>
							Cancel
						</Button>
						{#if data.canEdit}
							<Button type="submit" disabled={isSavingSettings}>
								{isSavingSettings ? 'Saving...' : 'Save Changes'}
							</Button>
						{/if}
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
