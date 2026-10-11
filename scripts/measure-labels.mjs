import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const labels = {
	13: ['N', '1 mi', '2 mi', '5 mi', '10 mi', 'I-4', 'US-192', 'US-27', 'SR-417', 'SR-429', 'World Dr'],
	14: [
		'Villa',
		'Animal Kingdom',
		'Hollywood Studios',
		'Hollywood',
		'EPCOT',
		'Magic Kingdom',
		'Disney Springs',
		'SeaWorld',
		'Universal Studios',
		'Universal',
		'Epic Universe',
		'LEGOLAND',
		'Blizzard Beach',
		'Blizzard',
		'Publix',
		'Target',
		'Vineland',
		'ChampionsGate',
		'Mystic Dunes',
		'Four Corners ER',
		'AdventHealth ER',
		'Island H2O',
		'Old Town',
		'MCO',
		'Celebration',
		'Four Corners',
		'Davenport',
		'Haines City'
	],
	15: ['Clermont', 'Winter Haven'],
	16: ['Kissimmee'],
	18: ['Orlando']
};

const executablePath = process.env.CHROME_PATH;
const browser = await chromium.launch({
	headless: true,
	args: ['--no-sandbox', '--disable-dev-shm-usage'],
	...(executablePath ? { executablePath } : { channel: 'chrome' })
});
const page = await browser.newPage();
const metrics = await page.evaluate(
	async ({ labels, FONT }) => {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 1200 400');
		svg.setAttribute('width', '1200');
		svg.setAttribute('height', '400');
		document.body.append(svg);
		const out = {};
		for (const [size, texts] of Object.entries(labels)) {
			out[size] = {};
			for (const text of texts) {
				const node = document.createElementNS('http://www.w3.org/2000/svg', 'text');
				node.setAttribute('x', '200');
				node.setAttribute('y', '120');
				node.setAttribute('font-size', size);
				node.setAttribute('font-weight', '700');
				node.setAttribute('font-family', FONT);
				node.textContent = text;
				svg.append(node);
				const box = node.getBBox();
				out[size][text] = {
					w: Math.ceil(box.width * 10) / 10,
					h: Math.ceil(box.height * 10) / 10,
					dx: Math.floor((box.x - 200) * 10) / 10,
					dy: Math.floor((box.y - 120) * 10) / 10
				};
				node.remove();
			}
		}
		return out;
	},
	{ labels, FONT }
);
await browser.close();
writeFileSync(new URL('../src/lib/data/label-metrics.json', import.meta.url), JSON.stringify(metrics, null, 2) + '\n');
console.log(JSON.stringify(metrics['14']['Hollywood Studios']), JSON.stringify(metrics['18']['Orlando']));
