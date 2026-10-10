import type { NearbyCategory, NearbyOrigin, NearbyPlace } from './nearby';
import frameData from './data/map-frames.json';
import seedData from './data/label-seeds.json';
import metricData from './data/label-metrics.json';

export const PIN_COLOR: Record<NearbyCategory, string> = {
	'theme-park': '#0a5f68',
	'water-park': '#0369a1',
	dining: '#9d174d',
	shopping: '#b45309',
	golf: '#3f6212',
	care: '#9f1239',
	airport: '#0f1b3d'
};

export const VILLA_COLOR = '#f5c542';

/** Same stack the label metrics were measured with. */
export const MAP_FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Five-point star centered on 0,0. Outer radius 13. */
export const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
	const radius = i % 2 === 0 ? 13 : 5.4;
	const angle = -Math.PI / 2 + (i * Math.PI) / 5;
	return `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;
}).join(' ');

export type MapFrame = {
	width: number;
	height: number;
	west: number;
	east: number;
	south: number;
	north: number;
};

export const MAP_FRAMES: { regional: MapFrame; local: MapFrame } = frameData;

/** Web Mercator world Y. Matches scripts/build-basemap.py. */
export function mercatorY(lat: number): number {
	const s = Math.sin((lat * Math.PI) / 180);
	return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

/** Project onto the basemap image. X is longitude; Y is Web Mercator, same scale. */
export function projectToFrame(lat: number, lng: number, frame: MapFrame): { x: number; y: number } {
	const x = ((lng - frame.west) / (frame.east - frame.west)) * frame.width;
	const y =
		((mercatorY(lat) - mercatorY(frame.north)) / (mercatorY(frame.south) - mercatorY(frame.north))) *
		frame.height;
	return { x, y };
}

export type MapPin = {
	id: string;
	name: string;
	drive: string;
	category: NearbyCategory | 'villa';
	n: number | null;
	x: number;
	y: number;
	/** True position when the numbered circle is nudged so it does not cover a neighbor. */
	dotX: number | null;
	dotY: number | null;
	label: string | null;
	labelX: number;
	labelY: number;
	anchor: 'start' | 'end' | 'middle';
	/** Line from the pin to the nearest edge of its label. */
	showLeader: boolean;
	leaderX: number;
	leaderY: number;
};

export type MapLabel = {
	text: string;
	x: number;
	y: number;
	anchor: 'start' | 'end' | 'middle';
	size: number;
	kind: 'pin' | 'town' | 'road' | 'chrome';
	/** Set on pin labels so a leader can be checked against its own text. */
	place?: string;
};

export type MapScene = {
	width: number;
	height: number;
	image: string;
	pins: MapPin[];
	labels: MapLabel[];
	scaleMiles: number;
	scaleX1: number;
	scaleX2: number;
	scaleY: number;
};

type Box = { x: number; y: number; w: number; h: number };
type Anchor = MapPin['anchor'];
type Metric = { w: number; h: number; dx: number; dy: number };

const metrics = metricData as Record<string, Record<string, Metric>>;

/**
 * Gap kept on every side of a label before it may touch a pin or another label.
 * 4 + 4 leaves room for a wider fallback face such as DejaVu.
 */
const GAP = 4;

function r1(n: number): number {
	return Math.round(n * 10) / 10;
}

function overlaps(a: Box, b: Box) {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function inflate(box: Box, pad: number): Box {
	return { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
}

function metric(size: number, text: string): Metric {
	const found = metrics[String(size)]?.[text];
	if (!found) throw new Error(`missing measured label box for ${size}px "${text}"`);
	return found;
}

/** Glyph box from a Chrome getBBox of this string, at text-anchor start. */
export function glyphBox(x: number, y: number, anchor: Anchor, size: number, text: string): Box {
	const m = metric(size, text);
	const left = anchor === 'start' ? x + m.dx : anchor === 'end' ? x - m.w + m.dx : x - m.w / 2 + m.dx;
	return { x: left, y: y + m.dy, w: m.w, h: m.h };
}

function collides(box: Box, taken: Box[]): boolean {
	const padded = inflate(box, GAP);
	return taken.some((other) => overlaps(padded, inflate(other, GAP)));
}

function inside(box: Box, frame: MapFrame): boolean {
	return box.x >= 2 && box.y >= 2 && box.x + box.w <= frame.width - 2 && box.y + box.h <= frame.height - 2;
}

type Seg = { x1: number; y1: number; x2: number; y2: number };

/** A leader that passes this close to another numbered pin is rejected. */
const LEADER_CLEAR = 16;
/** True-position dots are small. Keep the line off the dot without treating it like a full pin. */
const DOT_CLEAR = 6;
/** Draw a leader once the label box is farther than this from its pin. */
const LEADER_DRAW = 22;
/** A label farther than this stays off the map. The number on the pin is enough. */
const MAX_LEADER = 45;
/** Own pin must be this many times closer to the label than any other pin. */
const CLEAR_RATIO = 1.5;

function distPointToSeg(px: number, py: number, seg: Seg): number {
	const dx = seg.x2 - seg.x1;
	const dy = seg.y2 - seg.y1;
	const len2 = dx * dx + dy * dy;
	if (len2 < 1e-6) return Math.hypot(px - seg.x1, py - seg.y1);
	const t = Math.max(0, Math.min(1, ((px - seg.x1) * dx + (py - seg.y1) * dy) / len2));
	return Math.hypot(px - (seg.x1 + t * dx), py - (seg.y1 + t * dy));
}

function nearestOnBox(px: number, py: number, box: Box): { x: number; y: number } {
	return {
		x: Math.max(box.x, Math.min(px, box.x + box.w)),
		y: Math.max(box.y, Math.min(py, box.y + box.h))
	};
}

function distToBox(px: number, py: number, box: Box): number {
	const near = nearestOnBox(px, py, box);
	return Math.hypot(px - near.x, py - near.y);
}

function cross(ax: number, ay: number, bx: number, by: number) {
	return ax * by - ay * bx;
}

function segmentsIntersect(a: Seg, b: Seg): boolean {
	const rx = a.x2 - a.x1;
	const ry = a.y2 - a.y1;
	const sx = b.x2 - b.x1;
	const sy = b.y2 - b.y1;
	const qpx = b.x1 - a.x1;
	const qpy = b.y1 - a.y1;
	const denom = cross(rx, ry, sx, sy);
	if (Math.abs(denom) < 1e-8) {
		if (Math.abs(cross(qpx, qpy, rx, ry)) > 1e-8) return false;
		const rr = rx * rx + ry * ry;
		if (rr < 1e-8) return Math.hypot(qpx, qpy) < 1e-6;
		const t0 = (qpx * rx + qpy * ry) / rr;
		const t1 = t0 + (sx * rx + sy * ry) / rr;
		return Math.max(t0, t1) >= -1e-8 && Math.min(t0, t1) <= 1 + 1e-8;
	}
	const t = cross(qpx, qpy, sx, sy) / denom;
	const u = cross(qpx, qpy, rx, ry) / denom;
	return t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8;
}

function pointInBox(px: number, py: number, box: Box): boolean {
	return px >= box.x - 0.2 && px <= box.x + box.w + 0.2 && py >= box.y - 0.2 && py <= box.y + box.h + 0.2;
}

function segmentHitsBox(seg: Seg, box: Box): boolean {
	if (pointInBox(seg.x1, seg.y1, box) || pointInBox(seg.x2, seg.y2, box)) return true;
	const right = box.x + box.w;
	const bottom = box.y + box.h;
	const edges: Seg[] = [
		{ x1: box.x, y1: box.y, x2: right, y2: box.y },
		{ x1: right, y1: box.y, x2: right, y2: bottom },
		{ x1: right, y1: bottom, x2: box.x, y2: bottom },
		{ x1: box.x, y1: bottom, x2: box.x, y2: box.y }
	];
	return edges.some((edge) => segmentsIntersect(seg, edge));
}

/** Nudge overlapping circles apart. The villa star stays on its coordinate. */
function separate(pins: { id: string; x: number; y: number }[], min: number) {
	const disp = pins.map((p) => ({ id: p.id, x: p.x, y: p.y }));
	for (let pass = 0; pass < 12; pass++) {
		for (let i = 0; i < disp.length; i++) {
			for (let j = i + 1; j < disp.length; j++) {
				let dx = disp[j].x - disp[i].x;
				let dy = disp[j].y - disp[i].y;
				let dist = Math.hypot(dx, dy);
				if (dist >= min) continue;
				if (dist < 0.01) {
					dx = 1;
					dy = 0;
					dist = 1;
				}
				const ux = dx / dist;
				const uy = dy / dist;
				const need = min - dist;
				if (disp[i].id === 'villa') {
					disp[j].x += ux * need;
					disp[j].y += uy * need;
				} else if (disp[j].id === 'villa') {
					disp[i].x -= ux * need;
					disp[i].y -= uy * need;
				} else {
					disp[i].x -= (ux * need) / 2;
					disp[i].y -= (uy * need) / 2;
					disp[j].x += (ux * need) / 2;
					disp[j].y += (uy * need) / 2;
				}
			}
		}
	}
	return disp;
}

type Try = { dx: number; dy: number; anchor: Anchor };

const PIN_TRIES: Try[] = [];
for (const dist of [22, 30, 38, 46]) {
	for (let step = 0; step < 16; step++) {
		const angle = -Math.PI / 2 + (step / 16) * Math.PI * 2;
		const dx = Math.round(Math.cos(angle) * dist);
		const dy = Math.round(Math.sin(angle) * dist);
		const anchor: Anchor = dx > 6 ? 'start' : dx < -6 ? 'end' : 'middle';
		PIN_TRIES.push({ dx, dy, anchor });
	}
	for (const hang of [-24, -10, 10, 24]) {
		PIN_TRIES.push(
			{ dx: hang, dy: -dist, anchor: hang < 0 ? 'end' : 'start' },
			{ dx: hang, dy: dist, anchor: hang < 0 ? 'end' : 'start' }
		);
	}
}

function fanTries(size: number, distances: number[]): Try[] {
	const tries: Try[] = [];
	for (const dist of distances) {
		for (let step = 0; step < 16; step++) {
			const angle = -Math.PI / 2 + (step / 16) * Math.PI * 2;
			const dx = Math.round(Math.cos(angle) * dist);
			const dy = Math.round(Math.sin(angle) * dist);
			const anchor: Anchor = dx > 6 ? 'start' : dx < -6 ? 'end' : 'middle';
			tries.push({ dx, dy: dy - Math.round(size * 0.15), anchor });
		}
	}
	return tries;
}

function townTries(size: number): Try[] {
	return fanTries(size, [size + 2, size + 14, size + 26, 42, 58, 76, 96]);
}

const ROAD_TRIES: Try[] = fanTries(13, [10, 18, 28, 40, 56, 74]);

function milesPerPixel(frame: MapFrame, lat: number) {
	const span = (frame.east - frame.west) / 360;
	const equator = (40075016.686 * span) / frame.width;
	return (equator * Math.cos((lat * Math.PI) / 180)) / 1609.344;
}

type SeedFile = {
	regional: FrameSeeds;
	local: FrameSeeds;
};
type FrameSeeds = {
	towns: { text: string; size: number; x: number; y: number }[];
	roads: { text: string; size: number; points: number[][] }[];
};

const seeds = seedData as SeedFile;

function placeText(
	text: string,
	size: number,
	x: number,
	y: number,
	anchor: Anchor,
	taken: Box[],
	frame: MapFrame
): { x: number; y: number; box: Box } | null {
	const px = r1(x);
	const py = r1(y);
	const box = glyphBox(px, py, anchor, size, text);
	if (!inside(box, frame) || collides(box, taken)) return null;
	return { x: px, y: py, box };
}

function scene(
	frame: MapFrame,
	image: string,
	origin: NearbyOrigin,
	places: readonly (NearbyPlace & { n: number })[],
	seed: FrameSeeds
): MapScene {
	const project = (lat: number, lng: number) => projectToFrame(lat, lng, frame);
	const { width, height } = frame;
	const taken: Box[] = [];
	const labels: MapLabel[] = [];
	const used = new Set<string>();

	const claim = (label: MapLabel, box: Box) => {
		if (used.has(label.text)) return false;
		taken.push(box);
		labels.push(label);
		used.add(label.text);
		return true;
	};

	const mpp = milesPerPixel(frame, origin.lat);
	const nice = [10, 5, 2, 1].find((miles) => miles / mpp <= width * 0.42) ?? 1;
	const scaleX1 = 12;
	const scaleX2 = r1(12 + nice / mpp);
	const scaleY = height - 16;
	const scaleText = `${nice} mi`;
	const scaleLabel = placeText(scaleText, 13, scaleX1, scaleY - 8, 'start', taken, frame);
	if (scaleLabel) claim({ text: scaleText, x: scaleLabel.x, y: scaleLabel.y, anchor: 'start', size: 13, kind: 'chrome' }, scaleLabel.box);
	taken.push({ x: scaleX1, y: scaleY - 3, w: Math.max(8, scaleX2 - scaleX1), h: 6 });
	const north = placeText('N', 13, width - 22, 16, 'start', taken, frame);
	if (north) claim({ text: 'N', x: north.x, y: north.y, anchor: 'start', size: 13, kind: 'chrome' }, north.box);
	taken.push({ x: width - 26, y: 22, w: 20, h: 18 });

	type Draft = {
		id: string;
		name: string;
		drive: string;
		category: MapPin['category'];
		n: number | null;
		x: number;
		y: number;
		dotX: number | null;
		dotY: number | null;
		text: string;
	};

	const draft: Draft[] = [];
	const villaAt = project(origin.lat, origin.lng);
	draft.push({
		id: 'villa',
		name: origin.name,
		drive: 'the villa',
		category: 'villa',
		n: null,
		x: villaAt.x,
		y: villaAt.y,
		dotX: null,
		dotY: null,
		text: 'Villa'
	});
	for (const p of places) {
		const at = project(p.lat, p.lng);
		draft.push({
			id: p.id,
			name: p.name,
			drive: p.drive,
			category: p.category,
			n: p.n,
			x: at.x,
			y: at.y,
			dotX: null,
			dotY: null,
			text: p.label
		});
	}

	const disp = separate(draft, 32);
	for (const pin of draft) {
		const at = disp.find((item) => item.id === pin.id);
		if (!at) continue;
		if (Math.hypot(at.x - pin.x, at.y - pin.y) > 1) {
			pin.dotX = pin.x;
			pin.dotY = pin.y;
			pin.x = at.x;
			pin.y = at.y;
		}
		pin.x = r1(pin.x);
		pin.y = r1(pin.y);
		if (pin.dotX != null && pin.dotY != null) {
			pin.dotX = r1(pin.dotX);
			pin.dotY = r1(pin.dotY);
		}
	}

	const chromeBoxes = labels.map((label) => glyphBox(label.x, label.y, label.anchor, label.size, label.text));
	chromeBoxes.push({ x: scaleX1, y: scaleY - 3, w: Math.max(8, scaleX2 - scaleX1), h: 6 });
	chromeBoxes.push({ x: width - 26, y: 22, w: 20, h: 18 });
	for (const pin of draft) {
		taken.push({ x: pin.x - 14, y: pin.y - 14, w: 28, h: 28 });
		if (pin.dotX != null && pin.dotY != null) taken.push({ x: pin.dotX - 4, y: pin.dotY - 4, w: 8, h: 8 });
	}
	type Slot = { x: number; y: number; anchor: Anchor; box: Box; seg: Seg; dist: number; show: boolean };
	type PinPlacement = Pick<MapPin, 'label' | 'labelX' | 'labelY' | 'anchor' | 'showLeader' | 'leaderX' | 'leaderY'>;

	const labelBoxes = chromeBoxes.slice();
	const leaders: Seg[] = [];
	const placed = new Map<string, PinPlacement>();

	const take = (label: MapLabel, box: Box) => {
		if (used.has(label.text)) return false;
		taken.push(box);
		labelBoxes.push(box);
		labels.push(label);
		used.add(label.text);
		return true;
	};

	const blank = (pin: Draft): PinPlacement => ({
		label: null,
		labelX: pin.x,
		labelY: pin.y,
		anchor: 'start',
		showLeader: false,
		leaderX: pin.x,
		leaderY: pin.y
	});

	const clearlyNearest = (pin: Draft, box: Box) => {
		const own = distToBox(pin.x, pin.y, box);
		if (own > MAX_LEADER) return false;
		for (const other of draft) {
			if (other.id === pin.id) continue;
			if (distToBox(other.x, other.y, box) < own * CLEAR_RATIO) return false;
		}
		return true;
	};

	const leaderBad = (pin: Draft, seg: Seg, box: Box, boxes: Box[], lines: Seg[]) => {
		for (const other of draft) {
			if (other.id === pin.id) continue;
			if (distPointToSeg(other.x, other.y, seg) < LEADER_CLEAR) return true;
			if (other.dotX != null && other.dotY != null && distPointToSeg(other.dotX, other.dotY, seg) < DOT_CLEAR) return true;
		}
		if (boxes.some((label) => segmentHitsBox(seg, label))) return true;
		if (lines.some((line) => segmentsIntersect(seg, line) || segmentHitsBox(line, box))) return true;
		return false;
	};

	const slotsFor = (pin: Draft, blocked: Box[], extraBoxes: Box[], extraLines: Seg[], limit: number) => {
		const slots: Slot[] = [];
		const boxes = labelBoxes.concat(extraBoxes);
		const lines = leaders.concat(extraLines);
		for (const attempt of PIN_TRIES) {
			const hit = placeText(pin.text, 14, pin.x + attempt.dx, pin.y + attempt.dy, attempt.anchor, blocked, frame);
			if (!hit || !clearlyNearest(pin, hit.box)) continue;
			const near = nearestOnBox(pin.x, pin.y, hit.box);
			const dist = Math.hypot(pin.x - near.x, pin.y - near.y);
			const seg = { x1: pin.x, y1: pin.y, x2: r1(near.x), y2: r1(near.y) };
			const show = dist > LEADER_DRAW;
			if (show && leaderBad(pin, seg, hit.box, boxes, lines)) continue;
			slots.push({ ...hit, anchor: attempt.anchor, seg, dist, show });
			if (slots.length >= limit) break;
		}
		return slots;
	};

	// Pins with a free spot beside them are labeled. The rest stay number-only.
	const remaining = new Set(draft.map((pin) => pin.id));
	while (remaining.size) {
		let best: Draft | null = null;
		let bestSlots: Slot[] = [];
		for (const pin of draft) {
			if (!remaining.has(pin.id)) continue;
			const slots = slotsFor(pin, taken, [], [], 99);
			if (!best || slots.length < bestSlots.length) {
				best = pin;
				bestSlots = slots;
			}
		}
		if (!best) break;
		remaining.delete(best.id);
		const open = bestSlots.filter((slot) => {
			for (const other of draft) {
				if (other.id === best!.id || !remaining.has(other.id)) continue;
				const left = slotsFor(other, taken.concat(slot.box), [slot.box], slot.show ? [slot.seg] : [], 1);
				if (left.length === 0) return false;
			}
			return true;
		});
		const pool = open.length ? open : [];
		pool.sort((a, b) => a.dist - b.dist || Number(a.show) - Number(b.show));
		const chosen = pool[0];
		if (
			chosen &&
			take(
				{ text: best.text, x: chosen.x, y: chosen.y, anchor: chosen.anchor, size: 14, kind: 'pin', place: best.id },
				chosen.box
			)
		) {
			if (chosen.show) leaders.push(chosen.seg);
			placed.set(best.id, {
				label: best.text,
				labelX: chosen.x,
				labelY: chosen.y,
				anchor: chosen.anchor,
				showLeader: chosen.show,
				leaderX: chosen.seg.x2,
				leaderY: chosen.seg.y2
			});
		} else {
			placed.set(best.id, blank(best));
		}
	}

	const pinCenters = draft.map((pin) => ({ x: pin.x, y: pin.y }));
	const nearestPin = (x: number, y: number) => Math.min(...pinCenters.map((pin) => Math.hypot(pin.x - x, pin.y - y)));
	const putTown = (town: { text: string; size: number; x: number; y: number }) => {
		if (used.has(town.text)) return;
		for (const attempt of townTries(town.size)) {
			const hit = placeText(town.text, town.size, town.x + attempt.dx, town.y + attempt.dy, attempt.anchor, taken, frame);
			if (!hit || leaders.some((leader) => segmentHitsBox(leader, hit.box))) continue;
			take({ text: town.text, x: hit.x, y: hit.y, anchor: attempt.anchor, size: town.size, kind: 'town' }, hit.box);
			return;
		}
	};
	const townOrder = seed.towns.slice().sort((a, b) => {
		const rank = (text: string) => (text === 'Four Corners' ? 0 : text === 'Celebration' ? 1 : 2);
		return rank(a.text) - rank(b.text);
	});
	for (const town of townOrder) putTown(town);

	const roadOrder = seed.roads.slice().sort((a, b) => (a.text === 'World Dr' ? -1 : b.text === 'World Dr' ? 1 : 0));
	for (const road of roadOrder) {
		if (used.has(road.text)) continue;
		const points = road.points.slice().sort((a, b) => nearestPin(b[0], b[1]) - nearestPin(a[0], a[1]));
		let placedRoad = false;
		for (const [sx, sy] of points) {
			for (const attempt of ROAD_TRIES) {
				const hit = placeText(road.text, road.size, sx + attempt.dx, sy + attempt.dy, attempt.anchor, taken, frame);
				if (!hit || leaders.some((leader) => segmentHitsBox(leader, hit.box))) continue;
				take({ text: road.text, x: hit.x, y: hit.y, anchor: attempt.anchor, size: road.size, kind: 'road' }, hit.box);
				placedRoad = true;
				break;
			}
			if (placedRoad) break;
		}
	}

	return {
		width,
		height,
		image,
		scaleMiles: nice,
		scaleX1,
		scaleX2,
		scaleY,
		labels,
		pins: draft.map((pin) => ({ ...pin, ...placed.get(pin.id)! }))
	};
}

function numbered(places: readonly NearbyPlace[]) {
	return places.map((p, i) => ({ ...p, n: i + 1 }));
}

export function regionalScene(origin: NearbyOrigin, places: readonly NearbyPlace[]): MapScene {
	return scene(MAP_FRAMES.regional, '/maps/regional.svg', origin, numbered(places), seeds.regional);
}

/** Places under an 8-mile drive, on the closer basemap. */
export function localScene(origin: NearbyOrigin, places: readonly NearbyPlace[]): MapScene {
	return scene(
		MAP_FRAMES.local,
		'/maps/local.svg',
		origin,
		numbered(places).filter((p) => p.miles < 8),
		seeds.local
	);
}
