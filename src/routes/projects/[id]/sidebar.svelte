<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import FileIcon from '@lucide/svelte/icons/file';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import type { ComponentProps } from 'svelte';
	import type { ProjectDirectory, ProjectFile } from './tree';

	let {
		ref = $bindable(null),
		root,
		activeFile = null,
		onSelect,
		onCreateFile,
		onDeleteFile,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		root: ProjectDirectory;
		activeFile?: string | null;
		onSelect?: (path: string) => void;
		onCreateFile?: (path: string) => void;
		onDeleteFile?: (path: string) => void;
	} = $props();

	function handleSelect(path: string) {
		onSelect?.(path);
	}

	function handleDelete(e: MouseEvent, path: string) {
		e.stopPropagation();
		if (confirm(`Are you sure you want to delete "${path}"?`)) {
			onDeleteFile?.(path);
		}
	}

	let isCreating = $state(false);
	let newFileName = $state('');

	function startCreating() {
		isCreating = true;
		newFileName = '';
	}

	function cancelCreating() {
		isCreating = false;
		newFileName = '';
	}

	function confirmCreating() {
		if (newFileName.trim()) {
			onCreateFile?.(newFileName.trim());
			cancelCreating();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') confirmCreating();
		if (e.key === 'Escape') cancelCreating();
	}
</script>

<Sidebar.Root bind:ref {...restProps}>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel class="flex items-center justify-between">
				<span>Files</span>
				<button
					onclick={startCreating}
					class="rounded-sm p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					title="New File"
				>
					<PlusIcon class="h-4 w-4" />
				</button>
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#if isCreating}
						<div class="px-2 py-1">
							<Input
								bind:value={newFileName}
								onkeydown={handleKeydown}
								autofocus
								placeholder="filename.txt"
								class="h-8"
							/>
						</div>
					{/if}
					{#each root.children as item (item)}
						{@render Tree({ item, basePath: '' })}
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Rail />
</Sidebar.Root>

{#snippet Tree({ item, basePath }: { item: ProjectDirectory | ProjectFile; basePath: string })}
	{@const fullPath = basePath ? `${basePath}/${item.name}` : item.name}

	{#if item.type === 'file'}
		<Sidebar.MenuButton
			isActive={activeFile === fullPath}
			onclick={() => handleSelect(fullPath)}
			class="group/file justify-between pr-1"
		>
			<div class="flex items-center gap-2">
				<FileIcon />
				{item.name}
			</div>
			<button
				onclick={(e) => handleDelete(e, fullPath)}
				class="text-muted-foreground opacity-0 transition-opacity group-hover/file:opacity-100 hover:text-destructive"
				title="Delete File"
			>
				<Trash2Icon class="h-4 w-4" />
			</button>
		</Sidebar.MenuButton>
	{:else}
		<Sidebar.MenuItem>
			<Collapsible.Root
				class="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
			>
				<Collapsible.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton {...props}>
							<ChevronRightIcon class="transition-transform" />
							<FolderIcon />
							{item.name}
						</Sidebar.MenuButton>
					{/snippet}
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Sidebar.MenuSub>
						{#each item.children as subItem (subItem.name)}
							{@render Tree({ item: subItem, basePath: fullPath })}
						{/each}
					</Sidebar.MenuSub>
				</Collapsible.Content>
			</Collapsible.Root>
		</Sidebar.MenuItem>
	{/if}
{/snippet}
