<script lang="ts">
	let props: svelteHTML.SVGAttributes = $props();
</script>

<svg {...props} width="100" height="100" viewBox="0 0 100 100" version="1.1" id="svg1">
	<g id="layer1">
		<g id="g1">
			<path
				d="m 16,22 c 0,0 19.369944,-8.446668 34,0 14.630055,8.446665 34,0 34,0 L 68,80 50,87.855 32,80 Z"
				id="path1"
				class="vinum-logo-wine"
				style="fill:#903c47;fill-opacity:1"
			/>
			<g id="g3" transform="matrix(1.4348176,0,0,1.4348176,-43.26314,-21.118115)">
				<g id="g2" transform="rotate(-15,70.118429,-59.948012)">
					<rect
						style="stroke-width:8.29931"
						id="rect1"
						width="1.7006871"
						height="51.700691"
						x="14.149654"
						y="14.149654"
						class="vinum-logo-brackets"
					/>
					<rect
						style="stroke-width:8.00197"
						id="rect2"
						width="11.998003"
						height="1.9980319"
						x="14.000985"
						y="14.000985"
						class="vinum-logo-brackets"
					/>
					<rect
						style="stroke-width:8.00197"
						id="rect2-5"
						width="11.998003"
						height="1.9980319"
						x="14.000985"
						y="64.000984"
						class="vinum-logo-brackets"
					/>
				</g>
				<g
					id="g2-1"
					transform="matrix(-0.96592583,-0.25881905,-0.25881905,0.96592583,112.09508,16.105306)"
				>
					<rect
						style="stroke-width:8.29931"
						id="rect1-0"
						width="1.7006871"
						height="51.700691"
						x="14.149654"
						y="14.149654"
						class="vinum-logo-brackets"
					/>
					<rect
						style="stroke-width:8.00197"
						id="rect2-3"
						width="11.998003"
						height="1.9980319"
						x="14.000985"
						y="14.000985"
						class="vinum-logo-brackets"
					/>
					<rect
						style="stroke-width:8.00197"
						id="rect2-5-7"
						width="11.998003"
						height="1.9980319"
						x="14.000985"
						y="64.000984"
						class="vinum-logo-brackets"
					/>
				</g>
			</g>
		</g>
	</g>
</svg>

<style>
	.vinum-logo-wine {
		fill: #903c47;
		paint-order: fill markers stroke;
		stroke: #903c47;
		stroke-dasharray: none;
		stroke-width: 0;
	}
	.vinum-logo-brackets {
		fill: none;
		paint-order: fill markers stroke;
		stroke: #000000;
	}

	:global(.dark) .vinum-logo-wine {
		fill: #722f37;
		stroke: #722f37;
	}
	:global(.dark) .vinum-logo-brackets {
		stroke: #ffffff;
	}
</style>
