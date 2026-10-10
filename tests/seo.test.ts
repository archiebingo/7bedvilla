import { describe, it, expect } from 'vitest';
import page from '../src/routes/+page.svelte?raw';
import { vacationRentalLd, faqLd, breadcrumbLd, ldScript } from '../src/lib/seo';
import { llmsTxt, llmsFullTxt } from '../src/lib/llms';
import { photoByIndex } from '../src/lib/photo';
import { SITE_URL, DEFAULT_SITE_URL, resolveSiteUrl } from '../src/lib/site';
import { content } from '../src/lib/server/content';
import { GET as sitemapGet } from '../src/routes/sitemap.xml/+server';
import { GET as robotsGet } from '../src/routes/robots.txt/+server';
import { GET as llmsGet } from '../src/routes/llms.txt/+server';
import { GET as llmsFullGet } from '../src/routes/llms-full.txt/+server';

const roundTrip = (o: unknown) => JSON.parse(ldScript(o));
const BOOK_URL = content.bookUrl;

describe('VacationRental JSON-LD', () => {
	const ld = roundTrip(vacationRentalLd(content));
	it('parses and has the right type and context', () => {
		expect(ld['@context']).toBe('https://schema.org');
		expect(ld['@type']).toBe('VacationRental');
		expect(ld.name).toBe('Second Star to the Right');
	});
	it('has Kissimmee FL address and geo', () => {
		expect(ld.address.addressLocality).toBe('Kissimmee');
		expect(ld.address.addressRegion).toBe('FL');
		expect(ld.geo.latitude).toBe(28.313);
		expect(ld.geo.longitude).toBe(-81.647);
	});
	it('has containsPlace Accommodation with rooms, baths, occupancy', () => {
		const a = ld.containsPlace;
		expect(a['@type']).toBe('Accommodation');
		expect(a.additionalType).toBe('EntirePlace');
		expect(a.numberOfBedrooms).toBe(7);
		expect(a.numberOfBathroomsTotal).toBe(5.5);
		expect(a.occupancy.value).toBe(17);
		expect(a.occupancy.maxValue).toBe(17);
		expect(a.amenityFeature.map((f: { name: string }) => f.name)).toEqual(
			expect.arrayContaining(['pool', 'wifi', 'hotTub', 'kitchen', 'Game room'])
		);
	});
	it('has the real aggregate rating 9.6/10 from 124 reviews', () => {
		expect(ld.aggregateRating).toMatchObject({ ratingValue: 9.6, bestRating: 10, reviewCount: 124 });
	});
	it('lists amenity features', () => {
		expect(ld.amenityFeature.length).toBeGreaterThan(10);
		for (const f of ld.amenityFeature) expect(f['@type']).toBe('LocationFeatureSpecification');
		expect(ld.amenityFeature.map((f: { name: string }) => f.name)).toContain('Game room');
	});
	it('has 8 images including a bedroom, a bathroom, and a common area', () => {
		expect(ld.image).toHaveLength(8);
		const joined = ld.image.join(' ');
		expect(joined).toContain('ed6e1998');
		expect(joined).toContain('bdfad9b2');
		expect(joined).toContain('8588a4cb');
		for (const url of ld.image) expect(url.startsWith(`${SITE_URL}/photos/`)).toBe(true);
		expect(ld.potentialAction.target).toBe(BOOK_URL);
	});
	it('does not invent a street address or guest reviews', () => {
		expect(ld.address.streetAddress).toBeUndefined();
		expect(ld.address.postalCode).toBeUndefined();
		expect(ld.review).toBeUndefined();
	});
});

describe('FAQPage and BreadcrumbList JSON-LD', () => {
	it('FAQPage mirrors the on-page FAQ', () => {
		const ld = roundTrip(faqLd(content));
		expect(ld['@type']).toBe('FAQPage');
		expect(ld.mainEntity).toHaveLength(content.faq.length);
		for (const q of ld.mainEntity) {
			expect(q['@type']).toBe('Question');
			expect(q.acceptedAnswer.text.length).toBeGreaterThan(10);
		}
		const qs = ld.mainEntity.map((q: { name: string }) => q.name.toLowerCase()).join(' ');
		for (const k of ['disney', 'pool heat', 'guests', 'game room']) expect(qs).toContain(k);
		expect(ld.mainEntity.map((q: { acceptedAnswer: { text: string } }) => q.acceptedAnswer.text).join(' ')).toContain(
			'sleeps 14–17'
		);
	});
	it('BreadcrumbList has two distinct URLs', () => {
		const ld = roundTrip(breadcrumbLd(content));
		expect(ld['@type']).toBe('BreadcrumbList');
		expect(ld.itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2]);
		const urls = ld.itemListElement.map((i: { item: string }) => i.item);
		expect(new Set(urls).size).toBe(2);
		expect(urls[0]).toBe(`${SITE_URL}/`);
		expect(urls[1]).toBe(`${SITE_URL}/#villa`);
	});
	it('ldScript escapes < to prevent script breakout', () => {
		expect(ldScript({ x: '</script>' })).not.toContain('</script>');
	});
});

describe('content guardrails', () => {
	it('llms.txt and llms-full.txt contain key facts', () => {
		for (const t of [llmsTxt(content), llmsFullTxt(content)]) {
			expect(t).toContain('9.6');
			expect(t).toContain('124');
			expect(t).toContain('17');
			expect(t).toContain(BOOK_URL);
			expect(t).toContain('Free pool and spa heat (current special)');
			expect(t).not.toMatch(/\$\d/);
		}
	});
	it('keeps villa decor photos and drops the Disney-character TV still', () => {
		const srcs = content.photos.map((p) => p.src).join(' ');
		for (const id of ['50948c8f', '0650d9f2', '894987f0', 'f47c9bba', 'ac7958cd']) {
			expect(srcs).not.toContain(id);
		}
		expect(srcs).toContain('5a102260');
		expect(srcs).toContain('8cb75d69');
		for (const p of content.photos) expect(p.alt.length).toBeGreaterThan(10);
		expect(photoByIndex(content.photos, 18).alt.toLowerCase()).not.toContain('a pool table with balls, a pool table');
	});
	it('uses guest-facing wording and no prices', () => {
		const blob = [llmsTxt(content), llmsFullTxt(content), JSON.stringify(content), page].join('\n');
		expect(blob).not.toMatch(/\$\d/);
		expect(llmsTxt(content)).not.toContain('not live traffic');
		expect(llmsFullTxt(content)).not.toContain('not live traffic');
		expect(llmsFullTxt(content)).not.toContain('Nominatim');
		expect(llmsFullTxt(content)).not.toContain('OSRM');
		expect(llmsFullTxt(content)).toContain('Approximate drive times from Windsor at Westside');
		expect(llmsFullTxt(content)).toContain('https://www.openstreetmap.org/copyright');
		expect(blob).not.toContain('listing calls it');
		expect(blob).not.toContain('WHY US');
		expect(blob).not.toContain('no time stated');
		expect(blob).not.toContain('(VRBO)');
		expect(blob).not.toContain('Listed as wheelchair accessible with note');
		expect(blob).not.toContain('comfortably');
		expect(blob).not.toContain('private access');
		expect(blob).not.toContain('when available');
		expect(blob).toContain('separate access to the pool');
		expect(blob).toContain('New last-minute discounts');
		expect(blob).toContain('BBQ grill available to rent through management.');
		expect(blob.toLowerCase()).not.toMatch(/disclaimer|not affiliated|as-is|no warranty/);
		expect(page).toContain('content.bookUrl');
		expect(page).not.toContain('https://www.vrbo.com');
		expect(page).not.toContain('media.vrbo.com');
	});
});

describe('site URL, sitemap, robots, llms routes', () => {
	it('defaults the canonical origin and accepts an override', () => {
		expect(DEFAULT_SITE_URL).toBe('https://second-star-villa.vercel.app');
		expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
		expect(resolveSiteUrl('')).toBe(DEFAULT_SITE_URL);
		expect(resolveSiteUrl('https://example.com/')).toBe('https://example.com');
		expect(resolveSiteUrl('https://example.com/villa/')).toBe('https://example.com/villa');
		expect(() => resolveSiteUrl('not a url')).toThrow();
		expect(BOOK_URL).toBe('https://www.vrbo.com/4159245ha');
	});
	it('sitemap, robots, and llms files are generated from the same data', async () => {
		const sitemap = await (await sitemapGet()).text();
		expect(sitemap).toContain(`${SITE_URL}/</loc>`);
		expect(sitemap).toContain(`${SITE_URL}/llms.txt</loc>`);
		expect(sitemap).toContain(`${SITE_URL}/llms-full.txt</loc>`);
		const robots = await (await robotsGet()).text();
		for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
			expect(robots).toContain(`User-agent: ${bot}`);
		}
		expect(robots).toContain('Allow: /');
		expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
		expect(await (await llmsGet()).text()).toBe(llmsTxt(content));
		expect(await (await llmsFullGet()).text()).toBe(llmsFullTxt(content));
	});
});
