<script lang="ts">
	import { resolve } from '$app/paths';
	import { BookOpen, ChevronRight, FileText } from '@lucide/svelte';

	let { data } = $props();

	// Group docs by category
	const categories = $derived(() => {
		const map = new Map<string, Array<{ slug: string; title: string }>>();
		for (const doc of data.docList) {
			const cat = doc.category || 'General';
			if (!map.has(cat)) map.set(cat, []);
			map.get(cat)!.push({ slug: doc.slug, title: doc.title });
		}
		return Array.from(map.entries());
	});
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="flex flex-col md:flex-row gap-8">
		<!-- Sidebar Navigation -->
		<aside class="w-full md:w-64 shrink-0 border-r pr-6 space-y-6">
			<div class="flex items-center gap-2 font-bold text-lg text-primary">
				<BookOpen class="h-5 w-5" />
				Documentation
			</div>

			<nav class="space-y-6">
				{#each categories() as [category, docs] (category)}
					<div class="space-y-2">
						<h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							{category}
						</h4>
						<ul class="space-y-1">
							{#each docs as doc (doc.slug)}
								<li>
									<a
										href={resolve(`/docs/${doc.slug}`)}
										class="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors {data.slug === doc.slug ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
									>
										<FileText class="h-3.5 w-3.5" />
										{doc.title}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</nav>
		</aside>

		<!-- Document Content Area -->
		<main class="flex-1 max-w-3xl">
			<article class="prose dark:prose-invert max-w-none">
				<pre class="whitespace-pre-wrap font-sans text-foreground leading-relaxed">{data.content}</pre>
			</article>
		</main>
	</div>
</div>
