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
		removeCollaborator
	} from '$lib/remotes/projects.remote';
	import { invalidateAll } from '$app/navigation';
	import { compileDoc } from '$lib/remotes/compile.remote';
	import CodeMirrorEditor from '$lib/components/CodeMirrorEditor.svelte';
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
		Copy
	} from '@lucide/svelte';

	let { data } = $props();

	let files = $derived(data.files || []);
	let activeFilePath = $state('main.vinum');
	let activeContent = $state('');
	let compiledHtml = $state('');
	let compileErrors = $state('');
	let isCompiling = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	let newFileName = $state('');
	let showNewFileModal = $state(false);
	let showShareModal = $state(false);
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
			triggerDebouncedCompile(file.body);
		}
	}

	function handleCodeChange(newCode: string) {
		activeContent = newCode;
		triggerDebouncedCompile(newCode);
	}

	function triggerDebouncedCompile(code: string) {
		if (debounceTimer) clearTimeout(debounceTimer);
		isCompiling = true;

		debounceTimer = setTimeout(async () => {
			try {
				console.log(code);
				const res = await compileDoc(code);
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

		const path = newFileName.trim().endsWith('.vinum')
			? newFileName.trim()
			: `${newFileName.trim()}.vinum`;

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
		if (path === 'main.vinum') {
			alert('Cannot delete the main entry file.');
			return;
		}
		if (confirm(`Delete file "${path}"?`)) {
			await deleteFile({ projectId: data.project.id, relativePath: path });
			activeFilePath = 'main.vinum';
		}

		await invalidateAll();
	}

	async function submitRename(e: Event) {
    e.preventDefault();
    if (!renameInput.trim() || !fileToRename) return;

    const newPath = renameInput.trim().endsWith('.vinum')
        ? renameInput.trim()
        : `${renameInput.trim()}.vinum`;

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

	function downloadSingleFile(file: any) {
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
</script>

<svelte:window onclick={closeMenu} />

<div class="flex h-[calc(100vh-4rem)] flex-col bg-background">
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

			<Button variant="outline" size="sm" onclick={() => (showShareModal = true)} class="gap-1.5">
				<Share2 class="h-4 w-4" />
				Share
			</Button>
			<Button size="sm" disabled class="gap-1.5 opacity-60">
				<Download class="h-4 w-4" />
				Export PDF (Coming Soon)
			</Button>
		</div>
	</header>

	<!-- Main Workspace Split Pane -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar: File Tree & Assets -->
		<aside class="flex hidden w-64 flex-col justify-between border-r bg-muted/20 p-3 md:flex">
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>Files</span
					>
					<div class="flex gap-1">
						<button
							class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
							title="New File"
							onclick={() => (showNewFileModal = true)}
						>
							<Plus class="h-4 w-4" />
						</button>
						<button
							class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
							title="Upload Asset"
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

				<!-- File List -->
				<nav class="space-y-1">
					{#each files as file (file.id)}
						<button
							type="button"
							class="group flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors {activeFilePath ===
							file.relativePath
								? 'bg-primary/10 font-semibold text-primary'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
							onclick={() => {
								if (!file.isBinary) selectFile(file.relativePath);
							}}
						>
							<div class="flex items-center gap-2 truncate">
								{#if file.isBinary}
									<ImageIcon class="h-3.5 w-3.5 shrink-0 text-blue-500" />
								{:else}
									<FileCode class="h-3.5 w-3.5 shrink-0 text-amber-500" />
								{/if}
								<span class="truncate">{file.relativePath}</span>
							</div>
							{#if file.relativePath !== 'main.vinum'}
						    <div class="relative flex items-center">
					        <!-- 3-Dot Trigger Button -->
					        <button
					            class="p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
					            onclick={(e) => {
					                e.stopPropagation();
					                openMenuId = openMenuId === file.id ? null : file.id; 
					            }}
					            title="Options"
					        >
					            <MoreVertical class="h-4 w-4" />
					        </button>

					        <!-- Dropdown Menu -->
					        {#if openMenuId === file.id}
					            <div 
					                class="absolute right-0 top-full z-50 mt-1 flex w-28 flex-col overflow-hidden rounded-md border bg-background shadow-md"
					            >
						            	<!-- Download Button -->
									        <button
									            class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
									            onclick={(e) => {
									                e.stopPropagation();
									                downloadSingleFile(file);
									                openMenuId = null;
									            }}
									        >
									            <Download class="h-3.5 w-3.5" />
									            Download
									        </button>

									        <!-- Rename Button -->
													<button
													    class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
													    onclick={(e) => {
													        e.stopPropagation();
													        fileToRename = file.relativePath;
													        renameInput = file.relativePath;
													        showRenameModal = true;
													        openMenuId = null;
													    }}
													>
													    <Edit class="h-3.5 w-3.5" />
													    Rename
													</button>

									        <div class="h-px w-full bg-border"></div>

						            	<!-- Delete Button -->
					                <button
					                    class="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-muted"
					                    onclick={(e) => {
					                        e.stopPropagation();
					                        handleDeleteFile(file.relativePath);
					                        openMenuId = null;
					                    }}
					                >
					                    <Trash2 class="h-3.5 w-3.5" />
					                    Delete
					                </button>
					            </div>
					        {/if}
						    </div>
							{/if}
						</button>
					{/each}
				</nav>
			</div>

			<div class="space-y-1 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
				<p class="font-semibold text-foreground">Entry Document</p>
				<p class="truncate">{data.project?.entryFilePath}</p>
			</div>
		</aside>

		<!-- Center Code Editor Pane -->
		<div
			class="flex flex-1 flex-col border-r bg-background {activeTab === 'preview'
				? 'hidden md:flex'
				: 'flex'}"
		>
			<div
				class="flex h-9 items-center justify-between border-b bg-muted/10 px-4 font-mono text-xs"
			>
				<span>{activeFilePath}</span>
				<span class="text-muted-foreground">{activeContent.length} chars</span>
			</div>
			<div class="flex-1 p-2">
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
						class="absolute top-2 right-2 left-2 z-10 rounded-lg border border-destructive/50 bg-destructive/90 p-4 font-mono text-xs text-white shadow-lg backdrop-blur"
					>
						<p class="mb-1 font-bold">Compiler Error:</p>
						<pre class="whitespace-pre-wrap">{compileErrors}</pre>
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
					<Input placeholder="e.g. section1.vinum" bind:value={newFileName} required />
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
          <Input placeholder="e.g. new_name.vinum" bind:value={renameInput} required />
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
</div>
