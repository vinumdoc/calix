<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		minWidth?: number;
		minHeight?: number;
		initialWidth?: string | number;
		initialHeight?: string | number;
		resizableTop?: boolean;
		resizableRight?: boolean;
		resizableBottom?: boolean;
		resizableLeft?: boolean;
	}

	let {
		children,
		minWidth = 100,
		minHeight = 100,
		initialWidth = 'auto',
		initialHeight = 'auto',
		resizableTop = true,
		resizableRight = true,
		resizableBottom = true,
		resizableLeft = true
	}: Props = $props();

	let width: number | undefined = $state(undefined);
	let height: number | undefined = $state(undefined);

	let isResizing: boolean = $state(false);
	let startX: number = 0;
	let startY: number = 0;
	let startWidth: number = 0;
	let startHeight: number = 0;

	let activeDirections = { top: false, bottom: false, left: false, right: false };
	let boxElement: HTMLElement | undefined = $state(undefined);

	function startResize(
		event: PointerEvent,
		directions: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }
	): void {
		event.preventDefault();
		const handle = event.currentTarget as HTMLButtonElement;
		handle.setPointerCapture(event.pointerId);

		isResizing = true;
		startX = event.clientX;
		startY = event.clientY;

		if (boxElement) {
			const rect = boxElement.getBoundingClientRect();
			startWidth = width ?? rect.width;
			startHeight = height ?? rect.height;
		} else {
			startWidth = width ?? minWidth;
			startHeight = height ?? minHeight;
		}

		width = startWidth;
		height = startHeight;

		activeDirections = {
			top: !!directions.top,
			bottom: !!directions.bottom,
			left: !!directions.left,
			right: !!directions.right
		};
	}

	function handlePointerMove(event: PointerEvent): void {
		if (!isResizing) return;

		const dx = event.clientX - startX;
		const dy = event.clientY - startY;

		if (activeDirections.right) {
			width = Math.max(minWidth, startWidth + dx);
		}
		if (activeDirections.bottom) {
			height = Math.max(minHeight, startHeight + dy);
		}
		if (activeDirections.left) {
			width = Math.max(minWidth, startWidth - dx);
		}
		if (activeDirections.top) {
			height = Math.max(minHeight, startHeight - dy);
		}
	}

	function stopResize(event: PointerEvent): void {
		if (!isResizing) return;

		const handle = event.currentTarget as HTMLButtonElement;
		if (handle.hasPointerCapture(event.pointerId)) {
			handle.releasePointerCapture(event.pointerId);
		}

		isResizing = false;
	}
</script>

<div
	bind:this={boxElement}
	class="resizable-box"
	class:is-resizing={isResizing}
	style:width={width !== undefined 
		? `${width}px` 
			: typeof initialWidth === 'number' 
			? `${initialWidth}px` 
			: initialWidth}
	style:height={height !== undefined 
		? `${height}px` 
			: typeof initialHeight === 'number' 
			? `${initialHeight}px` 
			: initialHeight}
>
	<div class="content">
		{#if children}
			{@render children()}
		{/if}
	</div>

	<!-- Edge Handles -->
	{#if resizableTop}
		<button 
			type="button" 
			class="edge top" 
			onpointerdown={(e) => startResize(e, { top: true })}
			onpointermove={handlePointerMove}
			onpointerup={stopResize}
			aria-label="Resize Top"
		></button>
	{/if}

	{#if resizableRight}
		<button 
			type="button" 
			class="edge right" 
			onpointerdown={(e) => startResize(e, { right: true })}
			onpointermove={handlePointerMove}
			onpointerup={stopResize}
			aria-label="Resize Right"
		></button>
	{/if}

	{#if resizableBottom}
		<button 
			type="button" 
			class="edge bottom" 
			onpointerdown={(e) => startResize(e, { bottom: true })}
			onpointermove={handlePointerMove}
			onpointerup={stopResize}
			aria-label="Resize Bottom"
		></button>
	{/if}

	{#if resizableLeft}
		<button 
			type="button" 
			class="edge left" 
			onpointerdown={(e) => startResize(e, { left: true })}
			onpointermove={handlePointerMove}
			onpointerup={stopResize}
			aria-label="Resize Left"
		></button>
	{/if}
</div>

<style>
	:root {
		--border-hitzone: 8px;
	}

	.resizable-box {
		position: relative;
		display: block;
		max-width: 100%;
		min-width: 0;
		min-height: 0;
		background: #ffffff;
		user-select: none;
		box-sizing: border-box;
	}

	.resizable-box.is-resizing * {
		pointer-events: none !important;
	}

	.content {
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		box-sizing: border-box;
		overflow: auto;
	}

	.content :global(.cm-editor) {
		height: 100%;
		max-width: 100%;
	}

	.edge, .corner {
		padding: 0;
		border: none;
		background: transparent;
		touch-action: none;
	}

	.edge {
		position: absolute;
		z-index: 10;
	}

	.edge.top {
		top: calc(var(--border-hitzone) / -2);
		left: 0;
		width: 100%;
		height: var(--border-hitzone);
		cursor: ns-resize;
	}

	.edge.bottom {
		bottom: calc(var(--border-hitzone) / -2);
		left: 0;
		width: 100%;
		height: var(--border-hitzone);
		cursor: ns-resize;
	}

	.edge.left {
		top: 0;
		left: calc(var(--border-hitzone) / -2);
		width: var(--border-hitzone);
		height: 100%;
		cursor: ew-resize;
	}

	.edge.right {
		top: 0;
		right: calc(var(--border-hitzone) / -2);
		width: var(--border-hitzone);
		height: 100%;
		cursor: ew-resize;
	}
</style>
