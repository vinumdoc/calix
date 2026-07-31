<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { listProjects, createProject, deleteProject } from '$lib/remotes/projects.remote';
	import { FolderPlus, FileCode, Trash2, Search, ExternalLink } from '@lucide/svelte';

	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let search = $state('');
	let showCreateModal = $state(false);
	let newProjectName = $state('');
	let newProjectDesc = $state('');
	let creating = $state(false);

	const projects = $derived(data.projects || []);

	const filteredProjects = $derived(
		projects.filter((p) =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			(p.description && p.description.toLowerCase().includes(search.toLowerCase()))
		)
	);

	async function handleCreateProject(e: Event) {
		e.preventDefault();
		if (!newProjectName.trim()) return;

		creating = true;
		try {
			await createProject({
				name: newProjectName,
				description: newProjectDesc
			});
			showCreateModal = false;
			newProjectName = '';
			newProjectDesc = '';
			await invalidateAll();
		} catch (err) {
			console.error('Failed to create project:', err);
		} finally {
			creating = false;
		}
	}

	async function handleDeleteProject(id: string, name: string) {
		if (confirm(`Are you sure you want to delete "${name}"?`)) {
			await deleteProject(id);
			await invalidateAll();
		}
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8 space-y-8">
	<!-- Top Bar -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Your Projects</h1>
			<p class="text-muted-foreground">Manage and collaborate on your Vinum typesetting documents.</p>
		</div>
		<Button onclick={() => (showCreateModal = true)} class="gap-2">
			<FolderPlus class="h-4 w-4" />
			New Project
		</Button>
	</div>

	<!-- Search & Filter -->
	<div class="relative max-w-md">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input placeholder="Search projects..." class="pl-9" bind:value={search} />
	</div>

	<!-- Projects Grid -->
	{#if filteredProjects.length === 0}
		<div class="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
			<FileCode class="h-12 w-12 text-muted-foreground mb-4" />
			<h3 class="text-lg font-semibold">No projects found</h3>
			<p class="text-sm text-muted-foreground mb-4">Get started by creating your first Vinum project.</p>
			<Button onclick={() => (showCreateModal = true)} variant="outline" class="gap-2">
				<FolderPlus class="h-4 w-4" />
				Create Project
			</Button>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredProjects as project (project.id)}
				<Card.Root class="group relative flex flex-col justify-between transition-all hover:shadow-md">
					<Card.Header>
						<div class="flex items-start justify-between">
							<Card.Title class="text-xl font-bold line-clamp-1">{project.name}</Card.Title>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-muted-foreground hover:text-destructive"
								onclick={() => handleDeleteProject(project.id, project.name)}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
						<Card.Description class="line-clamp-2 min-h-[2.5rem]">
							{project.description || 'No description provided.'}
						</Card.Description>
					</Card.Header>
					<Card.Content class="pt-4 border-t flex items-center justify-between">
						<span class="text-xs text-muted-foreground">
							{new Date(project.updatedAt).toLocaleDateString()}
						</span>
						<Button href={resolve(`/projects/${project.id}`)} size="sm" class="gap-1">
							Open IDE
							<ExternalLink class="h-3.5 w-3.5" />
						</Button>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}

	<!-- Create Project Modal -->
	{#if showCreateModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<Card.Root class="w-full max-w-md bg-background shadow-xl">
				<Card.Header>
					<Card.Title>Create New Vinum Project</Card.Title>
					<Card.Description>Give your project a name and optional description.</Card.Description>
				</Card.Header>
				<Card.Content>
					<form onsubmit={handleCreateProject} class="space-y-4">
						<div class="space-y-2">
							<label for="name" class="text-sm font-medium">Project Name</label>
							<Input id="name" placeholder="e.g. Organic Chemistry Paper" required bind:value={newProjectName} />
						</div>
						<div class="space-y-2">
							<label for="desc" class="text-sm font-medium">Description (optional)</label>
							<Input id="desc" placeholder="Brief summary of document" bind:value={newProjectDesc} />
						</div>
						<div class="flex justify-end gap-2 pt-2">
							<Button type="button" variant="outline" onclick={() => (showCreateModal = false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={creating}>
								{creating ? 'Creating...' : 'Create Project'}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
