import { loadNearby, type NearbyOrigin, type NearbyPlace } from './nearby';
import type { Photo } from './photo';

/** Photos actually rendered or referenced in JSON-LD. Photo 46 (Disney character on the TV) is omitted. */
const RENDERED_INDEXES = [
	0, 1, 2, 5, 6, 7, 10, 11, 12, 14, 15, 16, 17, 18, 19, 22, 23, 25, 26, 28, 29, 30, 31, 33, 38, 39, 44
] as const;

const DROP_INDEXES = new Set([46]);

/**
 * Guest-facing replacements for source notes. Keys are listing.json strings.
 * This module is server-only: the page receives the returned object, not the listing.
 */
const REPLACEMENTS: Record<string, string> = {
	'Free pool and spa heat (listing calls it a current special; spa heat requires the pool to be heated)':
		'Free pool and spa heat (current special). Spa heat requires the pool to be heated.',
	'BBQ grill available to rent for $70/week through management, set up with propane before arrival':
		'BBQ grill available to rent through management.',
	"Washer and 2 dryers (first floor; one dryer in the outdoor closet per 'WHY US')":
		'Washer and 2 dryers on the first floor, with one dryer in the outdoor closet.',
	"Listed as wheelchair accessible with note: 'Several inch step to pool, door, and shower on first floor'":
		'Wheelchair accessible, with a several-inch step to the pool, door, and shower on the first floor.',
	'Urgent care center about 2.5 miles away': 'MD Now Urgent Care — Clermont, about 11 min / 5 mi',
	"About 800 feet from the villa ('REALLY VERY CLOSE')": 'About 800 feet from the villa',
	'Starter amounts of toilet paper, cleaning goods and garbage bags only; no starter food (per law)':
		'Starter amounts of toilet paper, cleaning goods and garbage bags only; no starter food.'
};

/** Fields that appear on the page, in JSON-LD, or in the llms files. */
export type Rating = { rating: number; bestRating: number; label: string; count: number };
export type Capacity = {
	bedrooms: number;
	bathrooms_total: number;
	bathrooms_full: number;
	bathrooms_half: number;
	sleeps_max: number;
};

type ListingPhoto = {
	index: number;
	file: string;
	caption_host?: string | null;
	alt_vrbo_generated?: string | null;
	use_on_site: boolean;
	width?: number;
	height?: number;
};

export type ListingInput = {
	name: string;
	booking: { v1_path: string };
	_meta: { expediaPropertyId: string };
	reviews: Rating & {
		host_claim?: string;
		snippets?: unknown;
		snippets_TODO?: string;
	};
	capacity: Capacity & {
		sleeps_range_text?: string;
		sleeps_17_note?: string;
	};
	geo: { latitude: number; longitude: number };
	host: { name: string; about: string; why_this_property: string };
	photos: ListingPhoto[];
	game_room: { items: string[]; host_tip: string };
	pool_and_outdoor: string[];
	tv_and_tech: string[];
	kitchen: string[];
	family_and_kids: string[];
	laundry: string[];
	essentials: string[];
	living_spaces: string[];
	safety: string[];
	accessibility: string;
	clubhouse: { distance: string; size: string; features: string[]; cost: string };
	location: {
		theme_parks: string[];
		nearby: { name: string; drive: string }[];
		getting_around: { name: string; drive: string }[];
		restaurants_nearby: string[];
	};
};

export type Content = {
	name: string;
	bookUrl: string;
	identifier: string;
	rating: Rating;
	capacity: Capacity;
	geo: ListingInput['geo'];
	host: { name: string; badge: string; about: string; why: string };
	photos: Photo[];
	quickFacts: [string, string][];
	highlights: { title: string; text: string }[];
	gameRoom: { items: string[]; host_tip: string };
	bedrooms: { name: string; beds: string; notes: string; photo: number | null }[];
	amenityGroups: { title: string; items: string[] }[];
	clubhouse: { distance: string; size: string; features: string[]; cost: string };
	location: {
		checked: string;
		origin: NearbyOrigin;
		attribution: string;
		places: NearbyPlace[];
	};
	discounts: string[];
	houseRules: [string, string][];
	faq: { q: string; a: string }[];
	sections: [string, string][];
};

function guest(value: string): string {
	const out = REPLACEMENTS[value] ?? value;
	if (/\$\d/.test(out)) throw new Error(`Dollar amount in guest copy: ${out}`);
	return out;
}

function lines(values: readonly string[]): string[] {
	return values.map(guest);
}

/** Drop machine alt text that repeats the same clause. */
function usableGeneratedAlt(text: string | null | undefined): string {
	const t = (text ?? '').trim();
	if (!t || t.length > 280) return '';
	const seen = new Map<string, number>();
	for (const clause of t.split(',')) {
		const key = clause.trim().toLowerCase();
		if (!key) continue;
		const n = (seen.get(key) ?? 0) + 1;
		if (n >= 3) return '';
		seen.set(key, n);
	}
	return t;
}

function toPhoto(p: ListingPhoto): Photo {
	const file = '/' + p.file.replace(/^photos\//, 'photos/');
	const caption = (p.caption_host ?? '').trim();
	const alt = [caption, usableGeneratedAlt(p.alt_vrbo_generated)].filter(Boolean).join(' – ');
	return {
		index: p.index,
		src: file,
		srcSmall: file.replace('.webp', '-800.webp'),
		alt: alt || 'Second Star to the Right villa',
		caption,
		width: p.width ?? 1600,
		height: p.height ?? 900
	};
}

export function curate(listing: ListingInput): Content {
	const eligible = new Map<number, Photo>();
	for (const p of listing.photos) {
		if (!p.use_on_site || DROP_INDEXES.has(p.index)) continue;
		eligible.set(p.index, toPhoto(p));
	}
	const photos = RENDERED_INDEXES.map((index) => {
		const photo = eligible.get(index);
		if (!photo) throw new Error(`rendered photo ${index} is not available`);
		return photo;
	});

	const name = listing.name;
	const resort = 'Windsor at Westside';
	const rating: Rating = {
		rating: listing.reviews.rating,
		bestRating: listing.reviews.bestRating,
		label: listing.reviews.label,
		count: listing.reviews.count
	};
	const capacity: Capacity = {
		bedrooms: listing.capacity.bedrooms,
		bathrooms_total: listing.capacity.bathrooms_total,
		bathrooms_full: listing.capacity.bathrooms_full,
		bathrooms_half: listing.capacity.bathrooms_half,
		sleeps_max: listing.capacity.sleeps_max
	};
	const poolHeat = 'Free pool and spa heat (current special)';
	const nearby = loadNearby();
	const latitude = Math.round(listing.geo.latitude * 1000) / 1000;
	const longitude = Math.round(listing.geo.longitude * 1000) / 1000;
	if (nearby.origin.lat !== latitude || nearby.origin.lng !== longitude) {
		throw new Error('nearby origin does not match the listing coordinates rounded to 3 decimals');
	}

	const content: Content = {
		name,
		bookUrl: listing.booking.v1_path,
		identifier: listing._meta.expediaPropertyId,
		rating,
		capacity,
		geo: { latitude, longitude },
		host: {
			name: listing.host.name,
			badge: 'Premier Host. They consistently provide great experiences for their guests.',
			about: listing.host.about,
			why: listing.host.why_this_property
		},
		photos,
		quickFacts: [
			['Property', `${name}, a Grand Collection villa (entire home)`],
			['Resort', `${resort} (gated), Kissimmee, Florida`],
			['Bedrooms', '7 (4 kings, 1 king downstairs)'],
			['Bathrooms', '5.5 (5 full, 1 half)'],
			['Sleeps', 'Sleeps 14–17 (17 uses the bunk-trundle room and the double bed)'],
			['Pool', `Private heated, lit pool and spa with kids’ safety fence. ${poolHeat}.`],
			['Game room', 'Karaoke stage, DJ lights, Megatouch, pool table, air hockey'],
			['TVs & Wi-Fi', '11 smart TVs incl. outdoor patio TV; free 100 Mbps Wi-Fi'],
			['Clubhouse', '10,000 sq ft, about 800 ft away: lazy river, aquapark, pickleball, gym, arcade'],
			['Disney', 'Animal Kingdom about 20 min / 9 mi; Magic Kingdom about 30 min / 14 mi'],
			['Airports', 'MCO about 50 min / 30 mi; Kissimmee Gateway (ISM) about 31 min'],
			['Check-in / out', 'After 4:00 PM / before 10:00 AM'],
			['Fees', 'No resort fees'],
			['Discount', '10% for returning guests, military, or 7+ nights (one per booking)'],
			['Pets', 'Not allowed'],
			['Rating', `${rating.rating}/10 “${rating.label}” from ${rating.count} reviews on Vrbo`]
		],
		highlights: [
			{
				title: 'Private heated pool & spa',
				text: `Lit pool and hot tub on a covered lanai with an outdoor TV. ${poolHeat}.`
			},
			{
				title: 'WOW game room',
				text: 'Karaoke stage, real DJ lights, cordless mikes, Megatouch bar game with 100+ games, pool table and air hockey.'
			},
			{
				title: '800 ft to the clubhouse',
				text: '10,000 sq ft clubhouse with lazy river, zero-entry heated pool, aquapark, sports courts, gym and arcade.'
			},
			{ title: 'Room for 17', text: '7 bedrooms with 4 kings, a bunk-trundle kids’ room, and 5.5 baths. Sleeps 14–17.' },
			{
				title: 'About 20 min to Animal Kingdom',
				text: 'Nearest Disney theme park, about 9 miles. Magic Kingdom’s ticket center is about 30 min / 14 mi.'
			},
			{ title: 'No resort fees', text: '10% off for returning guests, military, and stays of 7+ nights.' }
		],
		gameRoom: { items: lines(listing.game_room.items), host_tip: listing.game_room.host_tip },
		bedrooms: [
			{ name: 'Owner’s suite', beds: '1 king bed', notes: 'Ground floor · En-suite bathroom with shower and separate tub; separate pool access.', photo: 28 },
			{ name: 'Bedroom 2', beds: '1 king bed', notes: 'Second floor · King suite.', photo: 7 },
			{ name: 'Bedroom 3', beds: '2 twin beds', notes: 'Second floor · Separate beds for friends or children.', photo: 26 },
			{ name: 'Bedroom 4', beds: '1 king bed', notes: 'Second floor · A king bedroom for couples.', photo: 29 },
			{ name: 'Bedroom 5', beds: '1 king bed', notes: 'Second floor · A king bedroom for couples.', photo: 30 },
			{ name: 'Bedroom 6', beds: '1 double bed + 1 twin bed', notes: 'Second floor · Flexible sleeping arrangements for your group.', photo: 17 },
			{ name: 'Bedroom 7', beds: 'Bunk bed with a large lower bed + trundle', notes: 'Second floor · Upper bunk, larger lower bed and pull-out trundle.', photo: 31 }
		],
		amenityGroups: [
			{ title: 'Pool & outdoor', items: lines(listing.pool_and_outdoor) },
			{ title: 'TV & tech', items: lines(listing.tv_and_tech) },
			{ title: 'Kitchen & dining', items: lines(listing.kitchen) },
			{ title: 'Kids & family', items: lines(listing.family_and_kids) },
			{ title: 'Laundry & essentials', items: lines([...listing.laundry, ...listing.essentials]) },
			{ title: 'Living spaces', items: lines(listing.living_spaces) },
			{ title: 'Safety', items: lines(listing.safety) },
			{ title: 'Accessibility', items: [guest(listing.accessibility)] }
		],
		clubhouse: {
			distance: guest(listing.clubhouse.distance),
			size: listing.clubhouse.size,
			features: lines(listing.clubhouse.features),
			cost: listing.clubhouse.cost
		},
		location: nearby,
		discounts: [
			'No resort fees. Only tax, the cleaning fee plus tax, and the Vrbo service charge.',
			'10% off for returning guests, military members, and stays of 7 nights or more (one discount per reservation).',
			`${poolHeat}. Spa heat requires the pool to be heated.`,
			'New last-minute discounts.'
		],
		houseRules: [
			[
				'Check-in',
				'After 4:00 PM (in person or express check-in by calling Global, the management company; express check-in is a must for late arrivals)'
			],
			['Check-out', 'Before 10:00 AM'],
			['Children', 'Welcome (ages 0–17)'],
			['Pets', 'No pets'],
			['Events', 'No parties or events'],
			['Smoking', 'Not in the house or game room; allowed on the lanai-patio'],
			[
				'Pool',
				'No diving, no glass, no unsupervised children. Use the children’s pool safety fence when kids are present.'
			],
			[
				'Parking',
				'Maximum of 4 cars; 3–4 fit on the driveway depending on size. Don’t park on the grass or block the sidewalk (resort rule).'
			],
			['Booking', 'At least 7 days between booking request and arrival. E-checks only if paid 30+ days before arrival.'],
			['Supplies', 'Starter toilet paper, cleaning goods and garbage bags; no starter food.'],
			['Damage', 'You are responsible for any damage to the rental property caused by you or your party.']
		],
		faq: [
			{
				q: 'Is there a 7 bedroom villa near Disney with a game room?',
				a: `Yes. ${name} is a 7-bedroom, 5.5-bath villa at ${resort} in Kissimmee, about 20 minutes from Disney’s Animal Kingdom, with a game room that has a karaoke stage, DJ lights, a Megatouch game, a pool table and air hockey.`
			},
			{
				q: 'How far is the villa from Disney World?',
				a: 'Disney’s Animal Kingdom, the nearest theme park, is about a 20-minute drive (about 9 miles). The drive to Magic Kingdom ends at the Transportation and Ticket Center, about 30 minutes and 14 miles.'
			},
			{
				q: 'How many guests can stay?',
				a: 'It sleeps 14–17. Sleeping 17 usually means 4 children in the bunk-trundle room (1 on top, 2 on the bottom, 1 in the pullout trundle) and 2 guests in the double bed.'
			},
			{
				q: 'How many bedrooms and bathrooms are there?',
				a: '7 bedrooms, including 4 king bedrooms (one downstairs master with its own bath and separate access to the pool), and 5.5 bathrooms.'
			},
			{
				q: 'Is the pool heat free?',
				a: `Yes. ${poolHeat}. Spa heat requires the pool to be heated.`
			},
			{
				q: 'Does the villa have a private pool and hot tub?',
				a: 'Yes. A private heated, lit pool and spa on a covered lanai with an outdoor TV and a children’s pool safety fence.'
			},
			{
				q: 'Are there resort fees?',
				a: 'No resort fees. You pay only tax, the cleaning fee plus tax, and the Vrbo service charge.'
			},
			{
				q: 'Are there discounts?',
				a: '10% off for returning guests, military members, and stays of 7 nights or more. Only one discount per reservation. New last-minute discounts.'
			},
			{
				q: 'How far is the clubhouse?',
				a: 'About 800 feet. The 10,000 sq ft clubhouse has a lazy river, zero-entry heated pool, aquapark, hot spa, pickleball and other courts, gym, arcade, frozen yogurt, a bar and a sundries shop. Everything except purchases is complimentary.'
			},
			{
				q: 'How far is the airport?',
				a: 'Orlando International (MCO) is about a 50-minute drive (about 30 miles). Kissimmee Gateway (ISM) is about 31 minutes.'
			},
			{
				q: 'What are check-in and check-out times?',
				a: 'Check-in is after 4:00 PM and check-out is before 10:00 AM.'
			},
			{ q: 'Are pets allowed?', a: 'No, pets are not allowed.' },
			{
				q: 'Is it good for babies and toddlers?',
				a: 'Yes. There is a high chair, 2 pack & play cribs, a stair fence, a stroller, toys and a pool safety fence.'
			},
			{ q: 'How many cars can we bring?', a: 'A maximum of 4 cars.' },
			{ q: 'How do I book?', a: 'Check dates and book on the Vrbo listing (property #4159245ha).' }
		],
		sections: [
			['highlights', 'Highlights'],
			['game-room', 'Game room'],
			['bedrooms', 'Bedrooms'],
			['amenities', 'Amenities'],
			['clubhouse', 'Clubhouse'],
			['location', 'Location'],
			['reviews', 'Reviews'],
			['hosts', 'Hosts'],
			['rules', 'House rules'],
			['discounts', 'Discounts'],
			['faq', 'FAQ']
		]
	};

	const blob = JSON.stringify(content);
	const leaked = [
		'server-rendered in vrbo.html',
		'over 100 five out of 5 star reviews',
		'sleeps 14-17*',
		'17 guests usually requires sleeping',
		'host_claim',
		'snippets_TODO',
		'Grandsons'
	].find((note) => blob.includes(note));
	if (/\$\d/.test(blob) || /media\.vrbo\.com/i.test(blob) || leaked) {
		throw new Error(`curated content leaked a price, image host, or internal note${leaked ? `: ${leaked}` : ''}`);
	}
	return content;
}
