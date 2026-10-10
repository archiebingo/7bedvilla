import { readFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../build/index.html', import.meta.url).pathname).toString('utf8');

async function launch(): Promise<Browser> {
	const executablePath = process.env.CHROME_PATH;
	const args = ['--no-sandbox', '--disable-dev-shm-usage'];
	if (executablePath) return chromium.launch({ headless: true, executablePath, args });
	return chromium.launch({ headless: true, channel: 'chrome', args });
}

describe('header layout', () => {
	let browser: Browser;
	let page: Page;

	beforeAll(async () => {
		browser = await launch();
		page = await browser.newPage();
	});

	afterAll(async () => {
		await browser?.close();
	});

	async function render(width: number, hash?: string) {
		await page.setViewportSize({ width, height: 844 });
		await page.setContent(html, { waitUntil: 'domcontentloaded' });
		if (hash) {
			await page.evaluate((id) => {
				document.documentElement.style.scrollBehavior = 'auto';
				document.getElementById(id)?.scrollIntoView();
			}, hash);
		}
	}

	it('keeps Check dates fully visible without horizontal scroll', async () => {
		for (const width of [1024, 1280, 1440]) {
			await render(width);
			const box = await page.evaluate(() => {
				const nav = document.querySelector('nav[aria-label="Sections"]');
				if (!nav) throw new Error('missing section nav');
				const cta = [...nav.querySelectorAll('a')].find((a) => a.textContent?.includes('Check dates'));
				if (!cta) throw new Error('missing Check dates');
				const rect = cta.getBoundingClientRect();
				const navRect = nav.getBoundingClientRect();
				return {
					scrollGap: document.documentElement.scrollWidth - document.documentElement.clientWidth,
					navGap: nav.scrollWidth - nav.clientWidth,
					left: rect.left,
					right: rect.right,
					navRight: navRect.right,
					width: rect.width
				};
			});
			expect(box.scrollGap, `page scroll at ${width}`).toBeLessThanOrEqual(1);
			expect(box.navGap, `nav scroll at ${width}`).toBeLessThanOrEqual(1);
			expect(box.left, `cta left at ${width}`).toBeGreaterThanOrEqual(0);
			expect(box.right, `cta right at ${width}`).toBeLessThanOrEqual(box.navRight + 0.5);
			expect(box.width, `cta width at ${width}`).toBeGreaterThan(90);
		}
	});

	it('gives mobile chips a py-2 target and keeps the eyebrow below the header', async () => {
		await render(390, 'villa');
		const box = await page.evaluate(() => {
			const header = document.querySelector('header')?.getBoundingClientRect();
			const chip = document.querySelector('nav[aria-label="On this page"] a')?.getBoundingClientRect();
			const eyebrow = document.querySelector('#villa p')?.getBoundingClientRect();
			if (!header || !chip || !eyebrow) throw new Error('missing header, chip, or eyebrow');
			return {
				scrollGap: document.documentElement.scrollWidth - document.documentElement.clientWidth,
				chipHeight: chip.height,
				headerBottom: header.bottom,
				eyebrowTop: eyebrow.top
			};
		});
		expect(box.scrollGap).toBeLessThanOrEqual(1);
		expect(box.chipHeight).toBeGreaterThanOrEqual(32);
		expect(box.eyebrowTop).toBeGreaterThanOrEqual(box.headerBottom - 1);
	});
});
