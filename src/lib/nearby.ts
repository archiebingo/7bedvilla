import data from './data/nearby.json';

export const CATEGORY_ORDER = ['theme-park', 'water-park', 'dining', 'shopping', 'golf', 'care', 'airport'] as const;

export type NearbyCategory = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABEL: Record<NearbyCategory, string> = {
	'theme-park': 'Theme parks',
	'water-park': 'Water parks',
	dining: 'Shopping & dining',
	shopping: 'Shopping',
	golf: 'Golf',
	care: 'Care',
	airport: 'Airport'
};

export type NearbyPlace = {
	id: string;
	name: string;
	label: string;
	category: NearbyCategory;
	url: string;
	lat: number;
	lng: number;
	minutes: number;
	miles: number;
	drive: string;
	why: string;
	address: string;
	source: string;
};

export type NearbyOrigin = { name: string; lat: number; lng: number };

/**
 * Guest-facing drive string. Under 15 minutes, round to the nearest minute.
 * At 15 minutes and above, round to the nearest 5. Miles round to the nearest mile.
 */
export function formatDrive(minutes: number, miles: number): string {
	const min = minutes < 15 ? Math.round(minutes) : Math.round(minutes / 5) * 5;
	const mi = Math.round(miles);
	return `about ${min} min / ${mi} mi`;
}

type RawPlace = {
	id: string;
	name: string;
	label: string;
	category: string;
	url: string;
	lat: number;
	lng: number;
	minutes: number;
	miles: number;
	why: string;
	address: string;
	source: string;
};

const categories = new Set<string>(CATEGORY_ORDER);

function place(raw: RawPlace): NearbyPlace {
	if (!/^[a-z0-9-]+$/.test(raw.id)) throw new Error(`nearby id ${raw.id}`);
	if (!raw.url.startsWith('https://')) throw new Error(`${raw.id} needs an https URL`);
	if (!categories.has(raw.category)) throw new Error(`${raw.id} category`);
	if (!(raw.lat > 27 && raw.lat < 29 && raw.lng < -81 && raw.lng > -82)) {
		throw new Error(`${raw.id} coordinates are outside the Orlando area`);
	}
	if (!(raw.minutes > 0) || !(raw.miles > 0)) throw new Error(`${raw.id} drive`);
	if (!raw.why || !raw.address || !raw.source) throw new Error(`${raw.id} is missing a fact`);
	return {
		...raw,
		category: raw.category as NearbyCategory,
		drive: formatDrive(raw.minutes, raw.miles)
	};
}

export function loadNearby(): {
	checked: string;
	origin: NearbyOrigin;
	attribution: string;
	places: NearbyPlace[];
} {
	const places = data.places.map(place);
	const ids = new Set(places.map((p) => p.id));
	if (ids.size !== places.length) throw new Error('nearby ids must be unique');
	if (!data.attribution.includes('OpenStreetMap')) throw new Error('nearby attribution');
	return {
		checked: data.checked,
		origin: data.origin,
		attribution: data.attribution,
		places
	};
}
