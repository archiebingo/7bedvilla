import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAP_FRAMES, glyphBox, localScene, mercatorY, projectToFrame, regionalScene } from '../src/lib/area-map';
import { content } from '../src/lib/server/content';
import { CATEGORY_ORDER, formatDrive } from '../src/lib/nearby';
import mapSource from '../src/lib/components/AreaMap.svelte?raw';

const places = content.location.places;

describe('nearby places', () => {
	it('rounds drive times the same way the page displays them', () => {
		expect(formatDrive(6.94, 1.75)).toBe('about 7 min / 2 mi');
		expect(formatDrive(11.8, 5.31)).toBe('about 12 min / 5 mi');
		expect(formatDrive(20.23, 9.26)).toBe('about 20 min / 9 mi');
		expect(formatDrive(22.79, 11.44)).toBe('about 25 min / 11 mi');
		expect(formatDrive(28.39, 14.44)).toBe('about 30 min / 14 mi');
		expect(formatDrive(49.28, 30.37)).toBe('about 50 min / 30 mi');
	});

	it('gives every place an https URL, a drive, and coordinates', () => {
		expect(places.length).toBeGreaterThanOrEqual(12);
		expect(places.length).toBeLessThanOrEqual(20);
		const ids = new Set<string>();
		for (const place of places) {
			expect(place.url.startsWith('https://'), place.id).toBe(true);
			expect(place.drive, place.id).toBe(formatDrive(place.minutes, place.miles));
			expect(place.drive, place.id).toMatch(/about \d+ min \/ \d+ mi/);
			expect(Number.isFinite(place.lat), place.id).toBe(true);
			expect(Number.isFinite(place.lng), place.id).toBe(true);
			expect(place.why.length, place.id).toBeGreaterThan(10);
			ids.add(place.id);
		}
		expect(ids.size).toBe(places.length);
		expect(content.location.origin).toEqual({ name: 'Windsor at Westside', lat: 28.313, lng: -81.647 });
		expect(content.location.attribution).toBe('© OpenStreetMap contributors');
		expect(content.geo).toEqual({ latitude: 28.313, longitude: -81.647 });
		let n = 0;
		for (const category of CATEGORY_ORDER) {
			for (const place of places.filter((item) => item.category === category)) {
				n += 1;
				expect(places.indexOf(place) + 1, place.id).toBe(n);
			}
		}
		expect(n).toBe(places.length);
		expect(places.map((place) => place.id)).not.toContain('posner');
		expect(places.find((place) => place.id === 'vineland')?.url).toBe(
			'https://www.premiumoutlets.com/outlet/orlando-vineland'
		);
		expect(places.find((place) => place.id === 'disney-springs')?.category).toBe('dining');
		expect(places.find((place) => place.id === 'mco')?.drive).toBe('about 50 min / 30 mi');
		expect(places.find((place) => place.id === 'animal-kingdom')?.drive).toBe('about 20 min / 9 mi');
		expect(places.find((place) => place.id === 'magic-kingdom')?.drive).toBe('about 30 min / 14 mi');
	});

	it('drops the old Vrbo nearby list and the 2.5-mile urgent-care line', () => {
		const blob = JSON.stringify(content);
		for (const gone of ['Northeast Regional Park', 'Lake Davenport', 'Highland Reserve', 'The Taco Spot', 'Poinciana Station', '2.5 miles']) {
			expect(blob).not.toContain(gone);
		}
		expect(blob).toContain('AdventHealth Four Corners ER');
		const disney = content.faq.find((item) => item.q.startsWith('How far is the villa from Disney'));
		expect(disney?.a).toContain('20-minute');
		expect(disney?.a).toContain('Magic Kingdom');
		expect(content.faq.find((item) => item.q.includes('airport'))?.a).toContain('50-minute');
	});
});

describe('area map', () => {
	const regional = regionalScene(content.location.origin, places);
	const local = localScene(content.location.origin, places);

	it('draws the villa and one pin per nearby place', () => {
		const ids = regional.pins.map((pin) => pin.id);
		expect(ids).toContain('villa');
		expect(new Set(ids).size).toBe(ids.length);
		for (const place of places) {
			const pin = regional.pins.find((item) => item.id === place.id);
			expect(pin, place.id).toBeTruthy();
			expect(pin?.drive).toBe(place.drive);
			expect(pin?.name).toBe(place.name);
			expect(pin?.n).toBe(places.findIndex((item) => item.id === place.id) + 1);
		}
		expect(regional.pins.filter((pin) => pin.id !== 'villa')).toHaveLength(places.length);
	});

	it('keeps every pin inside the map and labels the close-in places', () => {
		for (const scene of [regional, local]) {
			for (const pin of scene.pins) {
				expect(pin.x).toBeGreaterThan(0);
				expect(pin.y).toBeGreaterThan(0);
				expect(pin.x).toBeLessThan(scene.width);
				expect(pin.y).toBeLessThan(scene.height);
			}
			for (let i = 0; i < scene.pins.length; i++) {
				for (let j = i + 1; j < scene.pins.length; j++) {
					const a = scene.pins[i];
					const b = scene.pins[j];
					expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} covers ${b.id}`).toBeGreaterThan(30);
				}
			}
		}
		for (const scene of [regional, local]) {
			const texts = scene.labels.map((label) => label.text);
			expect(new Set(texts).size, texts.join(', ')).toBe(texts.length);
			expect(texts.filter((text) => text === 'ChampionsGate').length).toBeLessThanOrEqual(1);
			const boxes = [
				...scene.labels.map((label) => ({
					id: `${label.kind}:${label.text}`,
					role: 'label' as const,
					...glyphBox(label.x, label.y, label.anchor, label.size, label.text)
				})),
				...scene.pins.flatMap((pin) => {
					const mark = [{ id: `pin:${pin.id}`, role: 'pin' as const, x: pin.x - 13, y: pin.y - 13, w: 26, h: 26 }];
					if (pin.dotX != null && pin.dotY != null) {
						mark.push({ id: `dot:${pin.id}`, role: 'pin', x: pin.dotX - 2.5, y: pin.dotY - 2.5, w: 5, h: 5 });
					}
					return mark;
				})
			];
			const pad = 1.5;
			for (let i = 0; i < boxes.length; i++) {
				for (let j = i + 1; j < boxes.length; j++) {
					const a = boxes[i];
					const b = boxes[j];
					if (a.role === 'pin' && b.role === 'pin') continue;
					const hit =
						a.x - pad < b.x + b.w + pad &&
						a.x + a.w + pad > b.x - pad &&
						a.y - pad < b.y + b.h + pad &&
						a.y + a.h + pad > b.y - pad;
					expect(hit, `${a.id} overlaps ${b.id}`).toBe(false);
				}
			}
		}
		expect(local.labels.some((label) => label.kind === 'town' && label.text === 'Four Corners')).toBe(true);
		expect(places.find((place) => place.id === 'vineland')?.why).toBe('Outlet shopping on Vineland Avenue.');
		for (const scene of [regional, local]) {
			const leaders = scene.pins.filter((pin) => pin.showLeader);
			for (const pin of leaders) {
				expect(Math.hypot(pin.leaderX - pin.x, pin.leaderY - pin.y), pin.id).toBeLessThanOrEqual(45.05);
			}
			for (let i = 0; i < leaders.length; i++) {
				for (let j = i + 1; j < leaders.length; j++) {
					const a = leaders[i];
					const b = leaders[j];
					const cross = segmentsIntersect(
						{ x1: a.x, y1: a.y, x2: a.leaderX, y2: a.leaderY },
						{ x1: b.x, y1: b.y, x2: b.leaderX, y2: b.leaderY }
					);
					expect(cross, `${a.id} crosses ${b.id}`).toBe(false);
				}
			}
			for (const pin of scene.pins) {
				if (!pin.label) {
					expect(pin.showLeader, pin.id).toBe(false);
					continue;
				}
				const box = glyphBox(pin.labelX, pin.labelY, pin.anchor, 14, pin.label);
				const own = distToBox(pin.x, pin.y, box);
				expect(own, pin.id).toBeLessThanOrEqual(45.05);
				for (const other of scene.pins) {
					if (other.id === pin.id) continue;
					expect(distToBox(other.x, other.y, box), `${pin.id} nearer ${other.id}`).toBeGreaterThanOrEqual(own * 1.5 - 0.05);
				}
				if (pin.showLeader) {
					const seg = { x1: pin.x, y1: pin.y, x2: pin.leaderX, y2: pin.leaderY };
					for (const other of scene.pins) {
						if (other.id === pin.id) continue;
						expect(distPointToSeg(other.x, other.y, seg), `${pin.id} leader near ${other.id}`).toBeGreaterThanOrEqual(16);
						if (other.dotX != null && other.dotY != null) {
							expect(distPointToSeg(other.dotX, other.dotY, seg), `${pin.id} leader near ${other.id} dot`).toBeGreaterThanOrEqual(6);
						}
					}
					for (const label of scene.labels) {
						if (label.place === pin.id) continue;
						const labelBox = glyphBox(label.x, label.y, label.anchor, label.size, label.text);
						expect(segmentHitsBox(seg, labelBox), `${pin.id} leader crosses ${label.text}`).toBe(false);
					}
				}
			}
		}
		const localIds = new Set(local.pins.map((pin) => pin.id));
		for (const place of places) {
			expect(localIds.has(place.id)).toBe(place.miles < 8);
		}
	});

	it('puts a name and drive time on each pin tooltip', () => {
		expect(mapSource).toContain('pin.drive');
		expect(mapSource).toContain('OpenStreetMap');
		expect(mapSource).toContain('data-place={pin.id}');
		expect(mapSource).toContain('loading="lazy"');
		expect(mapSource).toContain('data-legend={mapId}');
		expect(mapSource).toContain('grid-cols-2');
		expect(mapSource).toContain("kind === 'town' || label.kind === 'road' ? 'italic'");
	});

	it('projects pins in Web Mercator onto the basemap frame', () => {
		for (const frame of [MAP_FRAMES.regional, MAP_FRAMES.local]) {
			const spanX = (frame.east - frame.west) / 360;
			const spanY = mercatorY(frame.south) - mercatorY(frame.north);
			expect(frame.height).toBe(Math.round((frame.width * spanY) / spanX));
			const villa = projectToFrame(28.313, -81.647, frame);
			expect(villa.x).toBeGreaterThan(0);
			expect(villa.y).toBeGreaterThan(0);
			expect(villa.x).toBeLessThan(frame.width);
			expect(villa.y).toBeLessThan(frame.height);
		}
		const regionalVilla = regional.pins.find((pin) => pin.id === 'villa');
		const projected = projectToFrame(28.313, -81.647, MAP_FRAMES.regional);
		expect(regionalVilla?.dotX ?? regionalVilla?.x).toBeCloseTo(Math.round(projected.x * 10) / 10, 5);
		expect(regionalVilla?.dotY ?? regionalVilla?.y).toBeCloseTo(Math.round(projected.y * 10) / 10, 5);
		expect(String(regionalVilla?.x)).toMatch(/^-?\d+(\.\d)?$/);
	});
});

type Box = { x: number; y: number; w: number; h: number };
type Seg = { x1: number; y1: number; x2: number; y2: number };

function distPointToSeg(px: number, py: number, seg: Seg) {
	const dx = seg.x2 - seg.x1;
	const dy = seg.y2 - seg.y1;
	const len2 = dx * dx + dy * dy;
	if (len2 < 1e-6) return Math.hypot(px - seg.x1, py - seg.y1);
	const t = Math.max(0, Math.min(1, ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2));
	return Math.hypot(px - (seg.x1 + t * dx), py - (seg.y1 + t * dy));
}

function distToBox(px: number, py: number, box: Box) {
	const x = Math.max(box.x, Math.min(px, box.x + box.w));
	const y = Math.max(box.y, Math.min(py, box.y + box.h));
	return Math.hypot(px - x, py - y);
}

function segmentsIntersect(a: Seg, b: Seg) {
	const rx = a.x2 - a.x1;
	const ry = a.y2 - a.y1;
	const sx = b.x2 - b.x1;
	const sy = b.y2 - b.y1;
	const qpx = b.x1 - a.x1;
	const qpy = b.y1 - a.y1;
	const denom = rx * sy - ry * sx;
	if (Math.abs(denom) < 1e-8) return false;
	const t = (qpx * sy - qpy * sx) / denom;
	const u = (qpx * ry - qpy * rx) / denom;
	return t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8;
}

function segmentHitsBox(seg: Seg, box: Box) {
	const inside = (px: number, py: number) =>
		px >= box.x - 0.2 && px <= box.x + box.w + 0.2 && py >= box.y - 0.2 && py <= box.y + box.h + 0.2;
	if (inside(seg.x1, seg.y1) || inside(seg.x2, seg.y2)) return true;
	const right = box.x + box.w;
	const bottom = box.y + box.h;
	const edges: Seg[] = [
		{ x1: box.x, y1: box.y, x2: right, y2: box.y },
		{ x1: right, y1: box.y, x2: right, y2: bottom },
		{ x1: right, y1: bottom, x2: box.x, y2: bottom },
		{ x1: box.x, y1: bottom, x2: box.x, y2: box.y }
	];
	return edges.some((edge) => {
		const rx = seg.x2 - seg.x1;
		const ry = seg.y2 - seg.y1;
		const sx = edge.x2 - edge.x1;
		const sy = edge.y2 - edge.y1;
		const denom = rx * sy - ry * sx;
		const qpx = edge.x1 - seg.x1;
		const qpy = edge.y1 - seg.y1;
		if (Math.abs(denom) < 1e-8) return false;
		const t = (qpx * sy - qpy * sx) / denom;
		const u = (qpx * ry - qpy * rx) / denom;
		return t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8;
	});
}

function roadPoints(svg: string, name: string): [number, number][] {
	const group = svg.match(new RegExp(`<g data-road="${name}">([\\s\\S]*?)</g>`));
	expect(group, name).toBeTruthy();
	const nums = [...group![1].matchAll(/-?\d+\.?\d*/g)].map((match) => Number(match[0]));
	const points: [number, number][] = [];
	for (let i = 0; i < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
	return points;
}

describe('built location map', () => {
	const html = readFileSync(new URL('../build/index.html', import.meta.url).pathname).toString('utf8');

	it('keeps each basemap under 150 KB and draws highways across the frame', () => {
		for (const file of ['regional.svg', 'local.svg']) {
			const svg = readFileSync(new URL(`../static/maps/${file}`, import.meta.url).pathname).toString('utf8');
			expect(svg.length, file).toBeLessThan(150 * 1024);
			expect(svg, file).not.toContain('<text');
			expect(svg, file).not.toMatch(/M(-?\d+\.?\d*) (-?\d+\.?\d*) L\1 \2/);
			for (const road of ['I-4', 'US-192', 'SR-429']) expect(svg, file).toContain(`data-road="${road}"`);
		}
		const regionalSvg = readFileSync(new URL('../static/maps/regional.svg', import.meta.url).pathname).toString('utf8');
		const height = MAP_FRAMES.regional.height;
		const i4 = roadPoints(regionalSvg, 'I-4');
		expect(i4.some(([, y]) => y < 0)).toBe(true);
		expect(i4.some(([x, y]) => x < 0 || y > height)).toBe(true);
		expect(roadPoints(regionalSvg, 'SR-429').some(([, y]) => y < 0)).toBe(true);
		const us27 = roadPoints(regionalSvg, 'US-27');
		expect(us27.some(([, y]) => y < 0)).toBe(true);
		expect(us27.some(([, y]) => y > height)).toBe(true);
	});

	it('renders a pin for every place, plus attribution', () => {
		expect(html).toContain('role="img"');
		expect(html).toContain('data-place="villa"');
		expect(html).toContain('loading="lazy"');
		expect(html).toContain('/maps/regional.svg');
		expect(html).not.toContain('/maps/local.svg');
		expect(html).toContain('data-legend="regional"');
		expect(html).not.toContain('data-legend="local"');
		expect(html).toContain('https://www.openstreetmap.org/copyright');
		expect(html).toContain('Approximate drive times from Windsor at Westside');
		expect(html).toContain('28.313,-81.647');
		expect(html).not.toContain('28.31274');
		expect(html).not.toContain('-81.646659');
		expect(html).not.toContain('not live traffic');
		expect(html).not.toContain('Nominatim');
		expect(html).not.toContain('Photon');
		expect(html).not.toContain('Census');
		expect(html).not.toContain('OSRM');
		expect(html).not.toContain('shopposnercommons.com');
		for (const place of places) {
			expect(html, place.id).toContain(`data-place="${place.id}"`);
			expect(html, place.name).toContain(place.name);
			expect(html, place.drive).toContain(place.drive);
		}
		for (const label of regionalScene(content.location.origin, places).labels) {
			expect(html, label.text).toContain(`>${label.text}<`);
		}
	});
});
