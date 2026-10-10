<script lang="ts">
	import AreaMap from '$lib/components/AreaMap.svelte';
	import Img from '$lib/components/Img.svelte';
	import { PIN_COLOR } from '$lib/area-map';
	import { CATEGORY_LABEL, CATEGORY_ORDER } from '$lib/nearby';
	import { content } from '$lib/server/content';
	import { photoByIndex } from '$lib/photo';
	import { vacationRentalLd, faqLd, breadcrumbLd, ldScript } from '$lib/seo';
	import { SITE_URL, TITLE, DESCRIPTION } from '$lib/site';

	const hero = photoByIndex(content.photos, 38);
	const og = photoByIndex(content.photos, 44);
	const ogImage = `${SITE_URL}${og.src}`;
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${content.geo.latitude.toFixed(3)},${content.geo.longitude.toFixed(3)}`;
	const gameRoomPhotos = [18, 12].map((index) => photoByIndex(content.photos, index));
	const clubPhotos = [23, 14, 39, 11, 19, 6].map((index) => photoByIndex(content.photos, index));
	const gallery = [44, 25, 10, 1, 2, 33, 16, 5, 22, 15].map((index) => photoByIndex(content.photos, index));
	const ld = [vacationRentalLd(content), faqLd(content), breadcrumbLd(content)];
	let placeNumber = 1;
	const placeGroups = CATEGORY_ORDER.map((category) => {
		const places = content.location.places
			.filter((place) => place.category === category)
			.map((place) => ({ ...place, n: placeNumber++ }));
		return { category, label: CATEGORY_LABEL[category], places };
	}).filter((group) => group.places.length > 0);
</script>

<svelte:head>
	<title>{TITLE}</title>
	<meta name="description" content={DESCRIPTION} />
	<link rel="canonical" href="{SITE_URL}/" />
	<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={content.name} />
	<meta property="og:title" content={TITLE} />
	<meta property="og:description" content={DESCRIPTION} />
	<meta property="og:url" content="{SITE_URL}/" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:alt" content={og.alt} />
	<meta property="og:locale" content="en_US" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={TITLE} />
	<meta name="twitter:description" content={DESCRIPTION} />
	<meta name="twitter:image" content={ogImage} />
	<meta name="geo.region" content="US-FL" />
	<meta name="geo.placename" content="Kissimmee" />
	<meta name="geo.position" content="{content.geo.latitude};{content.geo.longitude}" />
	{#each ld as obj, i (i)}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html `<script type="application/ld+json">${ldScript(obj)}</` + `script>`}
	{/each}
</svelte:head>

<a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>

<header class="sticky top-0 z-20 border-b border-white/10 bg-night/95 text-white backdrop-blur">
	<nav aria-label="Sections" class="mx-auto flex max-w-6xl items-center px-4 py-3 text-sm whitespace-nowrap">
		<a href="#top" class="shrink-0 font-semibold text-star">★ {content.name}</a>
		<div class="ml-3 hidden min-w-0 flex-1 items-center justify-end gap-x-2 xl:gap-x-2.5 lg:flex">
			{#each content.sections as [id, label] (id)}
				<a
					href="#{id}"
					class="text-white/80 hover:text-white {id === 'rules' || id === 'discounts' ? 'max-xl:hidden' : ''}">{label}</a>
			{/each}
		</div>
		<a href={content.bookUrl} rel="noopener" class="ml-auto shrink-0 rounded-full bg-star px-4 py-1.5 font-semibold text-night lg:ml-3">Check dates</a>
	</nav>
	<nav aria-label="On this page" class="flex gap-2 overflow-x-auto px-4 pb-3 whitespace-nowrap lg:hidden">
		{#each content.sections as [id, label] (id)}
			<a href="#{id}" class="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs text-white/90">{label}</a>
		{/each}
	</nav>
</header>

<main id="main">
	<section id="top" class="relative isolate overflow-hidden bg-night text-white">
		<div class="absolute inset-0 -z-10 opacity-60"><Img p={hero} eager sizes="100vw" /></div>
		<div class="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/60 to-night/10"></div>
		<div class="mx-auto max-w-6xl px-4 pt-40 pb-12 md:pt-64">
			<div id="villa">
				<p class="text-sm font-semibold tracking-wide text-star uppercase">Windsor at Westside · Kissimmee, Florida</p>
				<h1 class="mt-2 text-4xl font-extrabold leading-tight md:text-6xl">{content.name}</h1>
			</div>
			<p class="mt-3 max-w-2xl text-lg text-white/90">
				7-bedroom pool villa with a karaoke &amp; DJ-light game room, sleeping up to 17, an 800-foot walk from the resort clubhouse and about 20 minutes from Disney’s Animal Kingdom.
			</p>
			<p class="mt-4 flex flex-wrap gap-2 text-sm">
				<span class="rounded-full bg-white/15 px-3 py-1">7 bedrooms</span>
				<span class="rounded-full bg-white/15 px-3 py-1">5.5 baths</span>
				<span class="rounded-full bg-white/15 px-3 py-1">Sleeps 17</span>
				<span class="rounded-full bg-white/15 px-3 py-1">★ {content.rating.rating}/10 · {content.rating.count} reviews</span>
			</p>
			<a href={content.bookUrl} rel="noopener" class="mt-6 inline-block rounded-full bg-star px-6 py-3 text-lg font-bold text-night shadow-lg">Check dates on Vrbo</a>
		</div>
	</section>

	<section aria-labelledby="facts-h" class="mx-auto max-w-6xl px-4 py-10">
		<h2 id="facts-h" class="text-2xl font-bold text-night">Quick facts</h2>
		<dl class="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
			{#each content.quickFacts as [k, v] (k)}
				<div class="border-b border-slate-200 pb-2">
					<dt class="text-xs font-semibold tracking-wide text-lagoon uppercase">{k}</dt>
					<dd class="text-slate-800">{v}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section id="highlights" aria-labelledby="highlights-h" class="bg-slate-50 py-12">
		<div class="mx-auto max-w-6xl px-4">
			<h2 id="highlights-h" class="text-3xl font-bold text-night">Highlights</h2>
			<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each content.highlights as h (h.title)}
					<li class="rounded-2xl bg-white p-5 shadow-sm">
						<h3 class="font-semibold text-night">{h.title}</h3>
						<p class="mt-1 text-slate-600">{h.text}</p>
					</li>
				{/each}
			</ul>
			<ul class="mt-8 grid grid-cols-2 gap-2 md:grid-cols-5" aria-label="Villa photos">
				{#each gallery as p (p.src)}
					<li class="aspect-[4/3] overflow-hidden rounded-xl">
						<figure class="h-full"><Img {p} sizes="(min-width: 768px) 20vw, 50vw" /><figcaption class="sr-only">{p.caption}</figcaption></figure>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section id="game-room" aria-labelledby="game-h" class="mx-auto max-w-6xl px-4 py-12">
		<h2 id="game-h" class="text-3xl font-bold text-night">The game room</h2>
		<p class="mt-2 max-w-3xl text-slate-700">A full-size game room “man-cave” where everyone meets after the parks. The smart TV is wired to the karaoke, so you can sing along to YouTube lyric videos.</p>
		<div class="mt-6 grid gap-6 md:grid-cols-2">
			<ul class="list-disc space-y-1 pl-5 text-slate-800">
				{#each content.gameRoom.items as item (item)}<li>{item}</li>{/each}
			</ul>
			<div class="grid grid-cols-2 gap-2">
				{#each gameRoomPhotos as p (p.src)}
					<figure class="col-span-2 aspect-video overflow-hidden rounded-xl">
						<Img {p} sizes="(min-width: 768px) 40vw, 100vw" />
					</figure>
				{/each}
			</div>
		</div>
		<p class="mt-4 text-slate-600">Host tip: “{content.gameRoom.host_tip}” Upstairs, the second-floor parlor has a poker table and a PlayStation 4.</p>
	</section>

	<section id="bedrooms" aria-labelledby="bed-h" class="bg-slate-50 py-12">
		<div class="mx-auto max-w-6xl px-4">
			<h2 id="bed-h" class="text-3xl font-bold text-night">Bedrooms &amp; sleeping</h2>
			<p class="mt-2 max-w-3xl text-slate-700">7 bedrooms with 4 kings (1 downstairs) and 5½ baths. Sleeps 14–17: 17 guests usually means 4 children in the bunk-trundle room and 2 guests in the double bed.</p>
			<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each content.bedrooms as b, i (i)}
					<li class="overflow-hidden rounded-2xl bg-white shadow-sm">
						{#if b.photo !== null}
							<div class="aspect-[4/3]"><Img p={photoByIndex(content.photos, b.photo)} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" /></div>
						{/if}
						<div class="p-4">
							<h3 class="font-semibold text-night">{b.name}</h3>
							<p class="text-slate-700">{b.beds}</p>
							{#if b.notes}<p class="text-sm text-slate-500">{b.notes}</p>{/if}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section id="amenities" aria-labelledby="amen-h" class="mx-auto max-w-6xl px-4 py-12">
		<h2 id="amen-h" class="text-3xl font-bold text-night">Amenities</h2>
		<div class="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			{#each content.amenityGroups as g (g.title)}
				<div>
					<h3 class="font-semibold text-lagoon">{g.title}</h3>
					<ul class="mt-2 list-disc space-y-1 pl-5 text-slate-800">
						{#each g.items as item (item)}<li>{item}</li>{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>

	<section id="clubhouse" aria-labelledby="club-h" class="bg-lagoon py-12 text-white">
		<div class="mx-auto max-w-6xl px-4">
			<h2 id="club-h" class="text-3xl font-bold">Windsor at Westside resort clubhouse</h2>
			<p class="mt-2 max-w-3xl text-white">The gated resort’s {content.clubhouse.size} clubhouse is about 800 feet from the villa. {content.clubhouse.cost}.</p>
			<ul class="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
				{#each content.clubhouse.features as f (f)}<li>✓ {f}</li>{/each}
			</ul>
			<ul class="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3" aria-label="Clubhouse photos">
				{#each clubPhotos as p (p.src)}
					<li class="aspect-[4/3] overflow-hidden rounded-xl"><Img {p} sizes="(min-width: 768px) 33vw, 50vw" /></li>
				{/each}
			</ul>
		</div>
	</section>

	<section id="location" aria-labelledby="loc-h" class="mx-auto max-w-6xl px-4 py-12">
		<h2 id="loc-h" class="text-3xl font-bold text-night">Location &amp; drive times</h2>
		<p class="mt-2 max-w-3xl text-slate-700">
			Kissimmee, Florida, in the Four Corners area of Osceola County. The star is the villa at Windsor at Westside.
			<a class="text-lagoon underline" href={mapsUrl} rel="noopener">Open in Google Maps</a>.
		</p>
		<p class="mt-2 max-w-3xl text-sm text-slate-600">Approximate drive times from Windsor at Westside.</p>
		<div class="mt-6 grid items-start gap-8 lg:grid-cols-2">
			<div class="min-w-0">
				<AreaMap origin={content.location.origin} places={content.location.places} />
				<p class="mt-3 text-xs leading-relaxed text-slate-600">
					<a class="underline" href="https://www.openstreetmap.org/copyright" rel="noopener">© OpenStreetMap contributors</a>
				</p>
				<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
					<li class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{PIN_COLOR['theme-park']}"></span> Theme park</li>
					<li class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{PIN_COLOR['water-park']}"></span> Water park</li>
					<li class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{PIN_COLOR.dining}"></span> Shopping &amp; dining</li>
					<li class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{PIN_COLOR.shopping}"></span> Shopping</li>
					<li class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{PIN_COLOR.golf}"></span> Golf</li>
					<li class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{PIN_COLOR.care}"></span> Care</li>
					<li class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{PIN_COLOR.airport}"></span> Airport</li>
				</ul>
			</div>
			<div>
				{#each placeGroups as group (group.category)}
					<h3 class="mt-6 font-semibold text-lagoon first:mt-0">{group.label}</h3>
					<ol class="mt-2 space-y-3" start={group.places[0].n}>
						{#each group.places as place (place.id)}
							<li class="flex gap-2 text-slate-800">
								<span
									class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
									style="background:{PIN_COLOR[place.category]}">{place.n}</span>
								<div>
									<a class="font-medium text-lagoon underline" href={place.url} rel="noopener">{place.name}</a>
									<span> — {place.drive}</span>
									<p class="text-sm text-slate-600">{place.why}</p>
								</div>
							</li>
						{/each}
					</ol>
				{/each}
			</div>
		</div>
	</section>

	<section id="reviews" aria-labelledby="rev-h" class="bg-night py-12 text-white">
		<div class="mx-auto max-w-6xl px-4">
			<h2 id="rev-h" class="text-3xl font-bold">Reviews</h2>
			<p class="mt-4 flex items-baseline gap-3">
				<span class="text-6xl font-extrabold text-star">{content.rating.rating}</span>
				<span class="text-xl">/ {content.rating.bestRating} · {content.rating.label}</span>
			</p>
			<p class="mt-1 text-white/80">From {content.rating.count} guest reviews on Vrbo. Hosted by {content.host.name}, Vrbo Premier Host.</p>
			<a href={content.bookUrl} rel="noopener" class="mt-4 inline-block text-star underline">Read all {content.rating.count} reviews on Vrbo</a>
			<blockquote class="mt-8 max-w-3xl border-l-4 border-star pl-4 text-white/90">
				<p>“At night the kids and adults after a dip in the pool or a long day at the parks meet in the game room, singing, dancing, and playing the games (I always lose).”</p>
				<footer class="mt-2 text-sm text-white/70">— {content.host.name}, hosts</footer>
			</blockquote>
		</div>
	</section>

	<section id="hosts" aria-labelledby="hosts-h" class="bg-slate-50 py-12">
		<div class="mx-auto max-w-6xl px-4">
			<h2 id="hosts-h" class="text-3xl font-bold text-night">Hosts</h2>
			<p class="mt-2 text-lg font-semibold text-night">{content.host.name}</p>
			<p class="text-lagoon">{content.host.badge}</p>
			<p class="mt-4 max-w-3xl text-slate-700">{content.host.about}</p>
			<p class="mt-4 max-w-3xl text-slate-700">{content.host.why}</p>
		</div>
	</section>

	<section id="rules" aria-labelledby="rules-h" class="mx-auto max-w-6xl px-4 py-12">
		<h2 id="rules-h" class="text-3xl font-bold text-night">House rules</h2>
		<dl class="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
			{#each content.houseRules as [k, v] (k)}
				<div class="border-b border-slate-200 pb-2"><dt class="font-semibold text-night">{k}</dt><dd class="text-slate-700">{v}</dd></div>
			{/each}
		</dl>
	</section>

	<section id="discounts" aria-labelledby="disc-h" class="bg-star/20 py-12">
		<div class="mx-auto max-w-6xl px-4">
			<h2 id="disc-h" class="text-3xl font-bold text-night">Discounts &amp; fees</h2>
			<ul class="mt-4 space-y-2 text-slate-800">{#each content.discounts as d (d)}<li>★ {d}</li>{/each}</ul>
		</div>
	</section>

	<section id="faq" aria-labelledby="faq-h" class="mx-auto max-w-4xl px-4 py-12">
		<h2 id="faq-h" class="text-3xl font-bold text-night">Frequently asked questions</h2>
		<div class="mt-6 divide-y divide-slate-200">
			{#each content.faq as f (f.q)}
				<details class="py-3">
					<summary class="cursor-pointer font-semibold text-night">{f.q}</summary>
					<p class="mt-2 text-slate-700">{f.a}</p>
				</details>
			{/each}
		</div>
	</section>

	<section aria-labelledby="cta-h" class="bg-night py-14 text-center text-white">
		<h2 id="cta-h" class="text-3xl font-bold">Your second star to the right</h2>
		<p class="mx-auto mt-2 max-w-xl text-white/80">Named after Peter Pan’s Neverland, “a place where you never grow up.”</p>
		<a href={content.bookUrl} rel="noopener" class="mt-6 inline-block rounded-full bg-star px-8 py-3 text-lg font-bold text-night">Check dates &amp; book</a>
	</section>
</main>

<footer class="bg-night pb-20 text-center text-sm text-white/60 md:pb-6">
	<p class="py-4">{content.name} · Windsor at Westside · Kissimmee, FL · Vrbo #4159245ha</p>
</footer>

<div class="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/95 p-3 md:hidden">
	<a href={content.bookUrl} rel="noopener" class="block rounded-full bg-star py-3 text-center font-bold text-night">Check dates · Sleeps 17</a>
</div>
