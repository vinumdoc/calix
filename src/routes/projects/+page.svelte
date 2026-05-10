<script lang="ts">
	import { base } from '$app/paths';
	import type { PageProps } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	let { data }: PageProps = $props();

	let editingId = $state<string | null>(null);
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Your Projects</h1>
		<Sheet.Root>
			<Sheet.Trigger>
				{#snippet child({ props })}
					<Button {...props}>
						<Plus class="mr-2 h-4 w-4" /> New Project
					</Button>
				{/snippet}
			</Sheet.Trigger>
			<Sheet.Content>
				<Sheet.Header>
					<Sheet.Title>Create New Project</Sheet.Title>
					<Sheet.Description>Give your project a name to get started.</Sheet.Description>
				</Sheet.Header>
				<form method="POST" action="?/create" class="grid gap-4 py-4">
					<div class="grid gap-2">
						<Label for="name">Project Name</Label>
						<Input id="name" name="name" placeholder="My Awesome Project" required />
					</div>
					<Sheet.Footer>
						<Button type="submit">Create</Button>
					</Sheet.Footer>
				</form>
			</Sheet.Content>
		</Sheet.Root>
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#if data.projects.length === 0}
			<div class="col-span-full py-12 text-center text-muted-foreground">
				No projects yet. Create one to get started!
			</div>
		{/if}
		{#each data.projects as project (project.id)}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex min-h-9 items-center justify-between leading-normal">
						{#if editingId === project.id}
							<form
								method="POST"
								action="?/rename"
								class="flex w-full items-center gap-2"
								onsubmit={() => (editingId = null)}
							>
								<input type="hidden" name="id" value={project.id} />
								<Input name="name" value={project.name} class="h-8" autofocus />
								<Button type="submit" size="icon" variant="ghost" class="h-8 w-8">
									<Check class="h-4 w-4" />
								</Button>
								<Button
									type="button"
									size="icon"
									variant="ghost"
									class="h-8 w-8"
									onclick={() => (editingId = null)}
								>
									<X class="h-4 w-4" />
								</Button>
							</form>
						{:else}
							<a
								href="{base}/projects/{project.id}"
								class="truncate decoration-primary/50 decoration-2 underline-offset-4 hover:underline"
							>
								{project.name}
							</a>
						{/if}
					</Card.Title>
					<Card.Description>-</Card.Description>
				</Card.Header>
				<Card.Content>
					<!-- Placeholder for project details like file count or last edited -->
				</Card.Content>
				<Card.Footer class="justify-end gap-2">
					<Button variant="ghost" size="icon" onclick={() => (editingId = project.id)}>
						<Pencil class="h-4 w-4" />
						<span class="sr-only">Rename</span>
					</Button>
					<form method="POST" action="?/delete">
						<input type="hidden" name="id" value={project.id} />
						<Button
							variant="ghost"
							size="icon"
							type="submit"
							class="text-destructive hover:bg-destructive/10 hover:text-destructive"
						>
							<Trash2 class="h-4 w-4" />
							<span class="sr-only">Delete</span>
						</Button>
					</form>
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>
</div>
