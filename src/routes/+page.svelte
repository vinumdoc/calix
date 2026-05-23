<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Cloud, Zap, Code2 } from '@lucide/svelte';
</script>

<div
	class="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center px-4 py-12 text-center"
>
	<!-- Hero Section -->
	<section class="max-w-3xl space-y-6">
		<h1 class="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
			The easiest way to use the <span class="text-primary">Vinum Compiler</span>
		</h1>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
			Calix is a cloud service providing a seamless developer experience for compiling and testing
			your Vinum projects without the hassle of local setup.
		</p>
		<div class="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
			<Button href={resolve('/login')} size="lg" class="w-full font-semibold sm:w-auto"
				>Get Started</Button
			>
			<Button
				href={resolve('/about')}
				variant="outline"
				size="lg"
				class="w-full font-semibold sm:w-auto"
			>
				Learn More
			</Button>
		</div>
	</section>

	<!-- Features Section -->
	<section class="mt-24 grid max-w-5xl grid-cols-1 gap-8 text-left md:grid-cols-3">
		<div
			class="flex flex-col items-start space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow"
		>
			<div class="rounded-lg bg-primary/10 p-3 text-primary">
				<Zap class="h-6 w-6" />
			</div>
			<h3 class="text-xl font-bold">Zero Local Setup</h3>
			<p class="text-muted-foreground">
				Skip the complex environment configurations. Start coding and compiling immediately right
				from your browser.
			</p>
		</div>

		<div
			class="flex flex-col items-start space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow"
		>
			<div class="rounded-lg bg-primary/10 p-3 text-primary">
				<Cloud class="h-6 w-6" />
			</div>
			<h3 class="text-xl font-bold">Cloud Compilation</h3>
			<p class="text-muted-foreground">
				Leverage the power of the cloud to build your Vinum projects. Fast, reliable, and accessible
				anywhere.
			</p>
		</div>

		<div
			class="flex flex-col items-start space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow"
		>
			<div class="rounded-lg bg-primary/10 p-3 text-primary">
				<Code2 class="h-6 w-6" />
			</div>
			<h3 class="text-xl font-bold">Developer Friendly</h3>
			<p class="text-muted-foreground">
				Enjoy features designed specifically for productivity, including modern tooling integrations
				and real-time previews.
			</p>
		</div>
	</section>
</div>
