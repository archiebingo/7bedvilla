<script lang="ts">
	import AreaMap from '$lib/components/AreaMap.svelte';
	import Img from '$lib/components/Img.svelte';
	import { PIN_COLOR } from '$lib/area-map';
	import { CATEGORY_LABEL, CATEGORY_ORDER } from '$lib/nearby';
	import { content } from '$lib/server/content';
	import { photoByIndex } from '$lib/photo';
	import { vacationRentalLd, faqLd, breadcrumbLd, ldScript } from '$lib/seo';
	import { SITE_URL, TITLE, DESCRIPTION } from '$lib/site';

	const hero = photoByIndex(content.photos, 0);
	const og = photoByIndex(content.photos, 44);
	const ogImage = `${SITE_URL}${og.src}`;
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${content.geo.latitude.toFixed(3)},${content.geo.longitude.toFixed(3)}`;
	const gameRoomPhotos = [18, 12].map((index) => photoByIndex(content.photos, index));
	const clubPhotos = [23, 14, 39, 11, 19, 6].map((index) => photoByIndex(content.photos, index));
	const gallery = [44, 38, 25, 10, 1, 2, 33, 16, 5, 22, 15].map((index) => photoByIndex(content.photos, index));
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
	<section id="top" class="overflow-hidden bg-night text-white">
		<div class="aspect-[16/9] w-full"><Img p={hero} eager sizes="100vw" /></div>
		<div class="relative mx-auto max-w-6xl px-4 py-10 md:py-12 lg:-mt-28 lg:pt-0">
			<div class="bg-night lg:max-w-3xl lg:rounded-t-2xl lg:p-8">
			<div id="villa">
				<p class="text-sm font-semibold tracking-wide text-star uppercase">Windsor at Westside · Kissimmee, Florida</p>
				<h1 class="mt-2 text-4xl font-extrabold leading-tight md:text-5xl">{content.name}</h1>
			</div>
			<p class="mt-3 max-w-2xl text-lg text-white/90">
				Luxury 7-bedroom villa near Disney, sleeping up to 17. Enjoy a private pool and spa, karaoke game room, and resort clubhouse just an 800-foot walk away.
			</p>
			<p class="mt-4 flex flex-wrap gap-2 text-sm">
				<span class="rounded-full bg-white/15 px-3 py-1">7 bedrooms</span>
				<span class="rounded-full bg-white/15 px-3 py-1">5.5 baths</span>
				<span class="rounded-full bg-white/15 px-3 py-1">Up to 17 guests</span>
				<span class="rounded-full bg-white/15 px-3 py-1">11 sleeping surfaces including bunk levels &amp; trundle</span>
				<span class="rounded-full bg-white/15 px-3 py-1">★ {content.rating.rating}/10 · {content.rating.count} reviews</span>
			</p>
			<a href={content.bookUrl} rel="noopener" class="mt-6 inline-block rounded-full bg-star px-6 py-3 text-lg font-bold text-night shadow-lg">Check dates on Vrbo</a><p class="mt-4 text-lg font-semibold text-star">Pool &amp; spa heat included · No resort fees</p><p class="mt-1 text-sm text-white/80">Pool and spa heat included as a current special.</p>
			</div>
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
			<h2 id="highlights-h" class="text-3xl font-bold text-night">A Kissimmee villa for family and group getaways</h2>
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
		<h2 id="game-h" class="text-3xl font-bold text-night">Private villa game room with karaoke</h2>
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
			<p class="text-sm font-semibold uppercase tracking-wide text-lagoon">Room for your whole group</p>
			<h2 id="bed-h" class="mt-2 text-3xl font-bold text-night">Find everyone’s favorite room</h2>
			<p class="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-semibold text-night"><span>Up to 17 guests</span><span>7 bedrooms</span><span>11 sleeping surfaces*</span><span>5½ bathrooms</span></p>
			<p class="mt-3 text-slate-700">Four king bedrooms, space for the kids, and a ground-floor suite. Choose a room to explore its bed configuration.</p>
			<div class="mt-6 grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
				<div>
					<fieldset class="bedroom-selector min-w-0">
						<legend class="mb-3 font-semibold text-night">Explore the bedrooms</legend>
						<div class="flex flex-wrap gap-2">
							{#each content.bedrooms as b, i (i)}
								<label class="room-choice relative cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-night">
									<input class="sr-only" type="radio" name="bedroom" value={i} checked={i === 0} aria-controls="bedroom-panel-{i}" />
									{b.name}
								</label>
							{/each}
						</div>
						<div class="mt-4">
							{#each content.bedrooms as b, i (i)}
								<section id="bedroom-panel-{i}" class="bedroom-panel overflow-hidden rounded-2xl bg-white shadow-sm" aria-labelledby="bedroom-title-{i}">
									{#if b.photo !== null}
										<div class="aspect-video"><Img p={{ ...photoByIndex(content.photos, b.photo), alt: `${b.name} with ${b.beds.toLowerCase()} at Second Star to the Right villa in Kissimmee` }} sizes="(min-width: 1024px) 65vw, 100vw" /></div>
									{:else}
										<div class="flex aspect-video items-center justify-center bg-star/15 p-6"><p class="text-center text-2xl font-semibold text-night">1 double bed + 1 twin bed</p></div>
									{/if}
									<div class="p-5"><h3 id="bedroom-title-{i}" class="text-xl font-bold text-night">{b.name}</h3><p class="mt-1 font-semibold text-lagoon">{b.beds}</p><p class="mt-2 text-slate-600">{b.notes}</p></div>
								</section>
							{/each}
						</div>
					</fieldset>
					<p class="mt-3 text-sm text-slate-600">*Includes both bunk levels and the pull-out trundle. Maximum occupancy is 17 guests.</p>
					<a href="#floor-plans" class="mt-3 inline-block font-semibold text-lagoon underline">See where each room is on the floor plans ↓</a>
				</div>
				<aside aria-labelledby="bed-booking-h" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-xs font-semibold uppercase tracking-wide text-lagoon">Plan your stay</p>
					<h3 id="bed-booking-h" class="mt-2 text-2xl font-bold text-night">A getaway everyone can share</h3>
					<p class="mt-5 text-3xl font-bold text-night">★ {content.rating.rating} / {content.rating.bestRating}</p>
					<p class="mt-1 text-slate-700">{content.rating.label} · {content.rating.count} guest reviews on Vrbo</p>
					<a href={content.bookUrl} rel="noopener" class="mt-2 inline-block text-sm text-lagoon underline">Read guest reviews on Vrbo ↗</a>
					<a href={content.bookUrl} rel="noopener" class="mt-6 block rounded-full bg-star px-5 py-3 text-center font-bold text-night">Check dates on Vrbo</a>
					<p class="mt-3 text-sm text-slate-600">View live availability, the full price and booking terms on Vrbo. Your booking is completed there.</p>
					<ul class="mt-5 space-y-2 border-t border-slate-200 pt-5 text-sm text-slate-700"><li>✓ Pool &amp; spa heat included — current special</li><li>✓ No resort fees</li><li>✓ 5 full bathrooms + 1 half bathroom</li></ul>
				</aside>
			</div>
		</div>
	</section>

	<section id="floor-plans" aria-labelledby="floor-plans-h" class="mx-auto max-w-6xl px-4 py-12">
		<h2 id="floor-plans-h" class="text-3xl font-bold text-night">Explore the villa floor plans</h2>
		<p class="mt-3 font-semibold text-lagoon">Up to 17 guests · 7 bedrooms · 11 sleeping surfaces · 5½ bathrooms</p>
		<p class="mt-2 max-w-3xl text-slate-700">Plan your stay together: one king suite downstairs and six bedrooms upstairs. Select a plan to open the full-size image.</p>
		<div class="mt-6 grid gap-6 sm:grid-cols-2">
			<figure class="rounded-2xl border border-slate-200 bg-white p-5">
				<figcaption class="mb-4"><h3 class="text-xl font-semibold text-night">First floor</h3><p class="mt-1 text-slate-600">King suite, kitchen, living and dining areas, game room, covered lanai, pool and hot tub.</p></figcaption>
				<a href="/first-floor.webp" target="_blank" rel="noopener" class="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-lagoon" aria-label="Open full-size first-floor plan in a new tab">
					<img src="/first-floor.webp" alt="First-floor villa plan with a king bed in the owner's suite, game room in the former garage, and hot tub in the pool's lower-right corner" width="787" height="1999" loading="lazy" decoding="async" class="mx-auto h-[32rem] w-full object-contain" />
					<span class="mt-4 block text-center font-semibold text-lagoon underline">View first floor full size ↗</span>
				</a>
			</figure>
			<figure class="rounded-2xl border border-slate-200 bg-white p-5">
				<figcaption class="mb-4"><h3 class="text-xl font-semibold text-night">Second floor</h3><p class="mt-1 text-slate-600">Bedrooms 2, 4 and 5: king beds. Bedroom 3: two twins. Bedroom 6: double bed and twin. Bedroom 7: bunk bed with a large lower bed and trundle.</p></figcaption>
				<a href="/second-floor.webp" target="_blank" rel="noopener" class="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-lagoon" aria-label="Open full-size second-floor plan in a new tab">
					<img src="/second-floor.webp" alt="Second-floor villa plan showing six bedrooms with labeled bed types, four bathrooms, a loft and stairs" width="803" height="1959" loading="lazy" decoding="async" class="mx-auto h-[32rem] w-full object-contain" />
					<span class="mt-4 block text-center font-semibold text-lagoon underline">View second floor full size ↗</span>
				</a>
			</figure>
		</div>
		<p class="mt-4 text-sm text-slate-500">Illustrative plans adapted from the original drawings, with current bed labels. The former garage is now the game room. Dimensions are approximate and based on the original plans.</p>
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
		<h2 id="loc-h" class="text-3xl font-bold text-night">Windsor at Westside, Kissimmee: near Disney &amp; Orlando</h2>
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
		<p class="mt-3 px-4 text-white/90">Up to 17 guests · 7 bedrooms · 11 sleeping surfaces · 5½ bathrooms</p>
		<p class="mt-3 text-star">★ {content.rating.rating}/{content.rating.bestRating} · {content.rating.count} guest reviews on Vrbo</p>
		<p class="mx-auto mt-2 max-w-xl text-white/80">Named after Peter Pan’s Neverland, “a place where you never grow up.”</p>
		<a href={content.bookUrl} rel="noopener" class="mt-6 inline-block rounded-full bg-star px-8 py-3 text-lg font-bold text-night">Check dates &amp; book</a><p class="mx-auto mt-4 max-w-xl px-4 text-lg font-semibold text-star">Your stay includes pool and spa heat—no extra heating fee.</p><p class="mt-1 text-sm text-white/80">Current special.</p>
	</section>
</main>

<footer class="bg-night pb-20 text-center text-sm text-white/60 md:pb-6">
	<p class="py-4">{content.name} · Windsor at Westside · Kissimmee, FL · Vrbo #4159245ha</p>
</footer>

<div class="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/95 p-3 md:hidden">
	<a href={content.bookUrl} rel="noopener" class="block rounded-full bg-star py-3 text-center font-bold text-night">Check dates · Sleeps 17</a>
</div>

<style>
	.room-choice:has(input:checked) { background: #141c3a; border-color: #141c3a; color: white; }
	.room-choice:has(input:focus-visible) { outline: 3px solid #327979; outline-offset: 3px; }
	/* Native radio controls keep the selector working without client-side JavaScript. */
	@supports selector(:has(input:checked)) {
		.bedroom-panel { display: none; }
		.bedroom-selector:has(input[value="0"]:checked) #bedroom-panel-0 { display: block; }
		.bedroom-selector:has(input[value="1"]:checked) #bedroom-panel-1 { display: block; }
		.bedroom-selector:has(input[value="2"]:checked) #bedroom-panel-2 { display: block; }
		.bedroom-selector:has(input[value="3"]:checked) #bedroom-panel-3 { display: block; }
		.bedroom-selector:has(input[value="4"]:checked) #bedroom-panel-4 { display: block; }
		.bedroom-selector:has(input[value="5"]:checked) #bedroom-panel-5 { display: block; }
		.bedroom-selector:has(input[value="6"]:checked) #bedroom-panel-6 { display: block; }
	}
</style>
