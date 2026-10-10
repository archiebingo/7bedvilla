import type { Photo } from './photo';
import { SITE_URL, DESCRIPTION } from './site';

type RentalContent = {
	name: string;
	bookUrl: string;
	identifier: string;
	rating: { rating: number; bestRating: number; count: number };
	capacity: {
		bedrooms: number;
		bathrooms_total: number;
		bathrooms_full: number;
		bathrooms_half: number;
		sleeps_max: number;
	};
	geo: { latitude: number; longitude: number };
	photos: readonly Photo[];
	faq: { q: string; a: string }[];
};

type AmenityValue = boolean | string;
type Amenity = { '@type': 'LocationFeatureSpecification'; name: string; value: AmenityValue };

function amenity(name: string, value: AmenityValue = true): Amenity {
	return { '@type': 'LocationFeatureSpecification', name, value };
}

/**
 * Google reads containsPlace.amenityFeature names from a fixed English list
 * (pool, wifi, hotTub, …). Descriptive names stay alongside those so the graph
 * still says "Game room" in plain language. Every item is a listing fact.
 */
const amenityFeature: Amenity[] = [
	amenity('pool'),
	amenity('hotTub'),
	amenity('ac'),
	amenity('heating'),
	amenity('wifi'),
	amenity('tv'),
	amenity('kitchen'),
	amenity('microwave'),
	amenity('ovenStove'),
	amenity('washerDryer'),
	amenity('patio'),
	amenity('outdoorGrill'),
	amenity('crib'),
	amenity('ironingBoard'),
	amenity('childFriendly'),
	amenity('wheelchairAccessible'),
	amenity('gymFitnessEquipment'),
	amenity('petsAllowed', false),
	amenity('internetType', 'Free'),
	amenity('poolType', 'Outdoor'),
	amenity('Private pool'),
	amenity('Heated pool'),
	amenity('Private hot tub'),
	amenity('Game room'),
	amenity('Karaoke'),
	amenity('Pool table'),
	amenity('Air hockey'),
	amenity('Smart TV'),
	amenity('Outdoor TV'),
	amenity('Free Wi-Fi'),
	amenity('Air conditioning'),
	amenity('Full kitchen'),
	amenity('Dishwasher'),
	amenity('Washer'),
	amenity('Dryer'),
	amenity('Barbecue grill (rental)'),
	amenity('Crib'),
	amenity('High chair'),
	amenity('Baby gate'),
	amenity('Pool safety fence'),
	amenity('Parking'),
	amenity('Resort clubhouse'),
	amenity('Lazy river'),
	amenity('Water park'),
	amenity('Fitness center'),
	amenity('Pickleball'),
	amenity('Arcade'),
	amenity('Playground')
];

const LD_PHOTO_INDEXES = [28, 22, 1, 2, 5, 18, 44, 10];

function ldPhotos(photos: readonly Photo[]): string[] {
	return LD_PHOTO_INDEXES.map((index) => {
		const photo = photos.find((p) => p.index === index);
		if (!photo) throw new Error(`structured-data photo ${index} is missing`);
		return `${SITE_URL}${photo.src}`;
	});
}

export function vacationRentalLd(content: RentalContent) {
	const { rating, geo, capacity } = content;
	return {
		'@context': 'https://schema.org',
		'@type': 'VacationRental',
		'@id': `${SITE_URL}/#rental`,
		identifier: content.identifier,
		name: content.name,
		description: DESCRIPTION,
		url: `${SITE_URL}/`,
		additionalType: 'Villa',
		image: ldPhotos(content.photos),
		// streetAddress and postalCode are TODO in listing.json — omitted, not invented.
		address: {
			'@type': 'PostalAddress',
			addressLocality: 'Kissimmee',
			addressRegion: 'FL',
			addressCountry: 'US'
		},
		latitude: geo.latitude,
		longitude: geo.longitude,
		geo: { '@type': 'GeoCoordinates', latitude: geo.latitude, longitude: geo.longitude },
		containedInPlace: { '@type': 'Resort', name: 'Windsor at Westside' },
		checkinTime: '16:00:00',
		checkoutTime: '10:00:00',
		petsAllowed: false,
		knowsLanguage: 'en-US',
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: rating.rating,
			bestRating: rating.bestRating,
			worstRating: 1,
			reviewCount: rating.count
		},
		amenityFeature,
		containsPlace: {
			'@type': 'Accommodation',
			additionalType: 'EntirePlace',
			numberOfBedrooms: capacity.bedrooms,
			// 5 full + 1 half. Google's half-bath example is a decimal (2 full + 1 half = 2.5).
			numberOfBathroomsTotal: capacity.bathrooms_total,
			numberOfFullBathrooms: capacity.bathrooms_full,
			numberOfPartialBathrooms: capacity.bathrooms_half,
			occupancy: {
				'@type': 'QuantitativeValue',
				value: capacity.sleeps_max,
				maxValue: capacity.sleeps_max,
				unitCode: 'C62'
			},
			// Only the 4 kings are stated as a bed count. Other beds stay on the page, not here.
			bed: [{ '@type': 'BedDetails', numberOfBeds: 4, typeOfBed: 'King' }],
			amenityFeature
		},
		potentialAction: { '@type': 'ReserveAction', target: content.bookUrl }
	};
}

export function faqLd(content: RentalContent) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: content.faq.map(({ q, a }) => ({
			'@type': 'Question',
			name: q,
			acceptedAnswer: { '@type': 'Answer', text: a }
		}))
	};
}

export function breadcrumbLd(content: RentalContent) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
			{ '@type': 'ListItem', position: 2, name: content.name, item: `${SITE_URL}/#villa` }
		]
	};
}

/** Serialize for a <script type="application/ld+json"> tag without allowing </script> breakout. */
export function ldScript(obj: unknown) {
	return JSON.stringify(obj).replace(/</g, '\\u003c');
}
