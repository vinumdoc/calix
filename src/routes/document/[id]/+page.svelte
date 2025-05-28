<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div>este vai ser o doc {JSON.stringify(data)}</div>
