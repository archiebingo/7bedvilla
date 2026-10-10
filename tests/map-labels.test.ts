import { readFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../build/index.html', import.meta.url).pathname).toString('utf8');
const WIDTHS = [360, 390, 768, 1024, 1440];

async function launch(): Promise<Browser> {
	const executablePath = process.env.CHROME_PATH;
	const args = ['--no-sandbox', '--disable-dev-shm-usage'];
	if (executablePath) return chromium.launch({ headless: true, executablePath, args });
	return chromium.launch({ headless: true, channel: 'chrome', args });
}

type Box = { id: string; role: 'label' | 'pin'; x: number; y: number; w: number; h: number; text?: string };

function overlaps(a: Box, b: Box) {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe('map labels', () => {
	let browser: Browser;
	let page: Page;

	beforeAll(async () => {
		browser = await launch();
		page = await browser.newPage();
	});

	afterAll(async () => {
		await browser?.close();
	});

	it('has no label overlap and no duplicate label on either map', async () => {
		const failures: string[] = [];
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			await page.setContent(html, { waitUntil: 'domcontentloaded' });
			const maps = await page.evaluate(() => {
				const pad = 1.5;
				const distPointToSeg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
					const dx = x2 - x1;
					const dy = y2 - y1;
					const len2 = dx * dx + dy * dy;
					if (len2 < 1e-6) return Math.hypot(px - x1, py - y1);
					const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
					return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
				};
				const distToBox = (px: number, py: number, box: { x: number; y: number; w: number; h: number }) => {
					const x = Math.max(box.x, Math.min(px, box.x + box.w));
					const y = Math.max(box.y, Math.min(py, box.y + box.h));
					return Math.hypot(px - x, py - y);
				};
				const hitsBox = (x1: number, y1: number, x2: number, y2: number, box: { x: number; y: number; w: number; h: number }) => {
					const inside = (px: number, py: number) =>
						px >= box.x - 0.2 && px <= box.x + box.w + 0.2 && py >= box.y - 0.2 && py <= box.y + box.h + 0.2;
					if (inside(x1, y1) || inside(x2, y2)) return true;
					const edges = [
						[box.x, box.y, box.x + box.w, box.y],
						[box.x + box.w, box.y, box.x + box.w, box.y + box.h],
						[box.x + box.w, box.y + box.h, box.x, box.y + box.h],
						[box.x, box.y + box.h, box.x, box.y]
					];
					return edges.some(([ax, ay, bx, by]) => {
						const rx = x2 - x1;
						const ry = y2 - y1;
						const sx = bx - ax;
						const sy = by - ay;
						const denom = rx * sy - ry * sx;
						if (Math.abs(denom) < 1e-8) return false;
						const qpx = ax - x1;
						const qpy = ay - y1;
						const t = (qpx * sy - qpy * sx) / denom;
						const u = (qpx * ry - qpy * rx) / denom;
						return t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8;
					});
				};
				return [...document.querySelectorAll('svg[data-map]')].map((svg) => {
					const name = svg.getAttribute('data-map') || 'map';
					const labels = [...svg.querySelectorAll('text[data-label]')].map((node) => {
						const box = (node as SVGGraphicsElement).getBBox();
						const rect = node.getBoundingClientRect();
						return {
							text: (node.textContent || '').trim(),
							kind: node.getAttribute('data-label') || '',
							place: node.getAttribute('data-place') || '',
							raw: { x: box.x, y: box.y, w: box.width, h: box.height },
							user: { x: box.x - pad, y: box.y - pad, w: box.width + pad * 2, h: box.height + pad * 2 },
							screen: { x: rect.x - 0.5, y: rect.y - 0.5, w: rect.width + 1, h: rect.height + 1 }
						};
					});
					const pins = [...svg.querySelectorAll('[data-pin]')].map((node) => {
						const box = (node as SVGGraphicsElement).getBBox();
						const rect = node.getBoundingClientRect();
						const id = node.closest('[data-place]')?.getAttribute('data-place') || 'pin';
						const moved = (node.getAttribute('transform') || '').match(/translate\(\s*(-?\d+\.?\d*)[\s,]+(-?\d+\.?\d*)\s*\)/);
						const x = box.x + (moved ? Number(moved[1]) : 0);
						const y = box.y + (moved ? Number(moved[2]) : 0);
						const cx = node instanceof SVGCircleElement ? Number(node.getAttribute('cx')) : x + box.width / 2;
						const cy = node instanceof SVGCircleElement ? Number(node.getAttribute('cy')) : y + box.height / 2;
						return {
							id,
							cx,
							cy,
							mark: box.width,
							user: { x: x - pad, y: y - pad, w: box.width + pad * 2, h: box.height + pad * 2 },
							screen: { x: rect.x - 0.5, y: rect.y - 0.5, w: rect.width + 1, h: rect.height + 1 }
						};
					});
					const leaders = [...svg.querySelectorAll('line[data-leader]')].map((node) => ({
						id: node.getAttribute('data-leader') || '',
						x1: Number(node.getAttribute('x1')),
						y1: Number(node.getAttribute('y1')),
						x2: Number(node.getAttribute('x2')),
						y2: Number(node.getAttribute('y2'))
					}));
					const leaderFaults: string[] = [];
					for (const leader of leaders) {
						for (const pin of pins) {
							if (pin.id === leader.id) continue;
							const dist = distPointToSeg(pin.cx, pin.cy, leader.x1, leader.y1, leader.x2, leader.y2);
							const limit = pin.mark > 10 ? 16 : 6;
							if (dist < limit) leaderFaults.push(`leader ${leader.id} passes ${dist.toFixed(1)} from ${pin.id}`);
						}
						for (const label of labels) {
							if (label.place && label.place === leader.id) continue;
							if (hitsBox(leader.x1, leader.y1, leader.x2, leader.y2, label.raw)) {
								leaderFaults.push(`leader ${leader.id} crosses "${label.text}"`);
							}
						}
					}
					for (let i = 0; i < leaders.length; i++) {
						const a = leaders[i];
						const length = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
						if (length > 45.05) leaderFaults.push(`leader ${a.id} is ${length.toFixed(1)} long`);
						for (let j = i + 1; j < leaders.length; j++) {
							const b = leaders[j];
							const rx = a.x2 - a.x1;
							const ry = a.y2 - a.y1;
							const sx = b.x2 - b.x1;
							const sy = b.y2 - b.y1;
							const denom = rx * sy - ry * sx;
							if (Math.abs(denom) < 1e-8) continue;
							const qpx = b.x1 - a.x1;
							const qpy = b.y1 - a.y1;
							const t = (qpx * sy - qpy * sx) / denom;
							const u = (qpx * ry - qpy * rx) / denom;
							if (t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8) {
								leaderFaults.push(`leader ${a.id} crosses ${b.id}`);
							}
						}
					}
					for (const label of labels) {
						if (label.kind !== 'pin' || !label.place) continue;
						const mains = pins.filter((pin) => pin.mark > 10);
						let own = Infinity;
						for (const pin of mains) {
							if (pin.id === label.place) own = distToBox(pin.cx, pin.cy, label.raw);
						}
						if (own > 45.05) leaderFaults.push(`"${label.text}" sits ${own.toFixed(1)} from its pin`);
						for (const pin of mains) {
							if (pin.id === label.place) continue;
							const dist = distToBox(pin.cx, pin.cy, label.raw);
							if (dist < own * 1.5 - 0.05) {
								leaderFaults.push(`"${label.text}" is ${dist.toFixed(1)} from ${pin.id} but ${own.toFixed(1)} from its pin`);
							}
						}
					}
					return { name, labels, pins, leaderFaults };
				});
			});

			expect(maps, `maps at ${width}`).toHaveLength(2);
			for (const map of maps) {
				for (const fault of map.leaderFaults) failures.push(`${map.name} @ ${width} ${fault}`);
				const texts = map.labels.map((label) => label.text);
				const dupes = texts.filter((text, index) => texts.indexOf(text) !== index);
				if (dupes.length) failures.push(`${map.name} @ ${width} duplicate ${dupes.join(', ')}`);
				const labelBoxes: Box[] = map.labels.map((label) => ({ id: label.text, role: 'label', ...label.user, text: label.text }));
				const pinBoxes: Box[] = map.pins.map((pin) => ({ id: pin.id, role: 'pin', ...pin.user }));
				for (let i = 0; i < labelBoxes.length; i++) {
					for (let j = i + 1; j < labelBoxes.length; j++) {
						if (overlaps(labelBoxes[i], labelBoxes[j])) {
							failures.push(`${map.name} @ ${width} label "${labelBoxes[i].text}" overlaps "${labelBoxes[j].text}"`);
						}
					}
					for (const pin of pinBoxes) {
						if (overlaps(labelBoxes[i], pin)) {
							failures.push(`${map.name} @ ${width} label "${labelBoxes[i].text}" overlaps pin ${pin.id}`);
						}
					}
				}
				const screenLabels: Box[] = map.labels.map((label) => ({ id: label.text, role: 'label', ...label.screen, text: label.text }));
				const screenPins: Box[] = map.pins.map((pin) => ({ id: pin.id, role: 'pin', ...pin.screen }));
				for (let i = 0; i < screenLabels.length; i++) {
					for (let j = i + 1; j < screenLabels.length; j++) {
						if (overlaps(screenLabels[i], screenLabels[j])) {
							failures.push(`${map.name} @ ${width}px screen label "${screenLabels[i].text}" overlaps "${screenLabels[j].text}"`);
						}
					}
					for (const pin of screenPins) {
						if (overlaps(screenLabels[i], pin)) {
							failures.push(`${map.name} @ ${width}px screen label "${screenLabels[i].text}" overlaps pin ${pin.id}`);
						}
					}
				}
			}
		}
		expect(failures, failures.join('\n') || '0 overlaps').toEqual([]);
	});
});
