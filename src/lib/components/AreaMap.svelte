<script lang="ts">
	import { regionalScene, MAP_FONT, PIN_COLOR, STAR_POINTS, VILLA_COLOR, type MapLabel, type MapScene } from '$lib/area-map';
	import type { NearbyOrigin, NearbyPlace } from '$lib/nearby';

	let { origin, places }: { origin: NearbyOrigin; places: NearbyPlace[] } = $props();

	const regional = $derived(regionalScene(origin, places));

	function desc(scene: MapScene, zoom: string) {
		const pins = scene.pins
			.map((pin) => (pin.id === 'villa' ? `${pin.name}, the villa` : `${pin.n}. ${pin.name}, ${pin.drive}`))
			.join('; ');
		return `${zoom}. ${pins}`;
	}

	function labelFill(kind: MapLabel['kind']) {
		if (kind === 'road') return '#78716c';
		if (kind === 'town') return '#64748b';
		return '#0f1b3d';
	}

	function badgeColor(category: keyof typeof PIN_COLOR) {
		return PIN_COLOR[category];
	}
</script>

{#snippet map(scene: MapScene, mapId: string, titleId: string, descId: string, caption: string, title: string, summary: string, alt: string)}
	<figure>
		<figcaption class="mb-2 text-sm font-semibold text-night">{caption}</figcaption>
		<div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#f4f0e6]" style="aspect-ratio: {scene.width} / {scene.height}">
			<img
				src={scene.image}
				{alt}
				width={scene.width}
				height={scene.height}
				loading="lazy"
				decoding="async"
				class="block h-full w-full"
			/>
			<svg
				viewBox="0 0 {scene.width} {scene.height}"
				role="img"
				aria-labelledby="{titleId} {descId}"
				data-map={mapId}
				font-family={MAP_FONT}
				class="absolute inset-0 h-full w-full"
			>
				<title id={titleId}>{title}</title>
				<desc id={descId}>{desc(scene, summary)}</desc>
				<line x1={scene.scaleX1} y1={scene.scaleY} x2={scene.scaleX2} y2={scene.scaleY} stroke="#0f1b3d" stroke-width="3" />
				<polygon points="{scene.width - 16},24 {scene.width - 24},38 {scene.width - 8},38" fill="#0f1b3d" stroke="#f4f0e6" stroke-width="1" />
				{#each scene.pins as pin (pin.id)}
					{#if pin.showLeader}
						<line data-leader={pin.id} x1={pin.x} y1={pin.y} x2={pin.leaderX} y2={pin.leaderY} stroke="#94a3b8" stroke-width="1" />
					{/if}
				{/each}
				{#each scene.pins as pin (pin.id)}
					<g data-place={pin.id}>
						<title>{pin.id === 'villa' ? `${pin.name} — the villa` : `${pin.name} — ${pin.drive}`}</title>
						{#if pin.dotX != null && pin.dotY != null}
							<line x1={pin.dotX} y1={pin.dotY} x2={pin.x} y2={pin.y} stroke="#0f1b3d" stroke-width="1.4" />
							<circle data-pin cx={pin.dotX} cy={pin.dotY} r="2.5" fill="#0f1b3d" />
						{/if}
						{#if pin.category === 'villa'}
							<polygon data-pin points={STAR_POINTS} transform="translate({pin.x} {pin.y})" fill={VILLA_COLOR} stroke="#0f1b3d" stroke-width="1.4" />
						{:else}
							<circle data-pin cx={pin.x} cy={pin.y} r="13" fill={PIN_COLOR[pin.category]} stroke="#ffffff" stroke-width="1.6" />
							<text x={pin.x} y={pin.y + 4} text-anchor="middle" fill="#ffffff" font-size="12" font-weight="700">{pin.n}</text>
						{/if}
					</g>
				{/each}
				{#each scene.labels as label (`${label.kind}-${label.text}`)}
					<text
						data-label={label.kind}
						data-place={label.place}
						x={label.x}
						y={label.y}
						text-anchor={label.anchor}
						fill={labelFill(label.kind)}
						font-size={label.size}
						font-weight={label.kind === 'pin' || label.kind === 'chrome' ? '700' : '500'}
						font-style={label.kind === 'town' || label.kind === 'road' ? 'italic' : 'normal'}
						stroke="#ffffff"
						stroke-width="3"
						paint-order="stroke">{label.text}</text>
				{/each}
			</svg>
		</div>
		<p class="mt-2 flex items-center gap-1.5 text-[13px] leading-snug text-slate-800">
			<svg viewBox="-14 -14 28 28" class="h-4 w-4 shrink-0" aria-hidden="true">
				<polygon points={STAR_POINTS} fill={VILLA_COLOR} stroke="#0f1b3d" stroke-width="1.4" />
			</svg>
			Villa — {scene.pins.find((pin) => pin.id === 'villa')?.name}
		</p>
		<ol data-legend={mapId} class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] leading-snug text-slate-800">
			{#each scene.pins as pin (pin.id)}
				{#if pin.category !== 'villa'}
					<li class="flex min-w-0 items-start gap-1.5">
						<span
							class="mt-0.5 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
							style="background:{badgeColor(pin.category)}">{pin.n}</span>
						<span class="min-w-0">{pin.name}</span>
					</li>
				{/if}
			{/each}
		</ol>
	</figure>
{/snippet}

<div class="space-y-4">
	{@render map(
		regional,
		'regional',
		'area-map-title',
		'area-map-desc',
		'Parks and places around the villa',
		'Attractions around Windsor at Westside',
		'OpenStreetMap basemap with a pin for the villa and every nearby place',
		'OpenStreetMap basemap of Interstate 4, US-192, US-27, SR-417, SR-429, and World Drive, with lakes and towns from Winter Haven to Orlando'
	)}
</div>
