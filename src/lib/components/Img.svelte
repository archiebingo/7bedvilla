<script lang="ts">
	import type { Photo } from '$lib/photo';
	let { p, eager = false, sizes = '(min-width: 768px) 50vw, 100vw', class: cls = '' }: { p: Photo; eager?: boolean; sizes?: string; class?: string } = $props();
</script>

<img
	src={p.srcSmall}
	srcset="{p.srcSmall} 800w, {p.src} 1600w"
	{sizes}
	alt={p.alt}
	width={p.width}
	height={p.height}
	loading={eager ? 'eager' : 'lazy'}
	decoding="async"
	fetchpriority={eager ? 'high' : 'auto'}
	class="h-full w-full object-cover {cls}"
/>
