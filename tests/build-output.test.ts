import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../build/', import.meta.url).pathname;

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) out.push(...walk(path));
		else out.push(path);
	}
	return out;
}

describe('built output', () => {
	it('does not ship excluded photos, Vrbo image hosts, or dollar amounts', () => {
		expect(existsSync(join(root, 'index.html')), 'run npm test (it builds first) or npm run build').toBe(true);
		const files = walk(root).filter((file) => /\.(html|js|css|txt|xml|svg|json)$/i.test(file));
		const text = files.map((file) => readFileSync(file).toString('utf8')).join('\n');
		for (const id of ['50948c8f', '0650d9f2', '894987f0', 'f47c9bba']) {
			expect(text, id).not.toContain(id);
		}
		expect(text).not.toContain('Grandsons');
		expect(text).not.toMatch(/media\.vrbo\.com/i);
		expect(text).not.toMatch(/\$\d/);
		expect(text).toContain('https://www.vrbo.com/4159245ha');
		expect(text).not.toContain('ac7958cd');
		expect(text).not.toContain('listing calls it');
		expect(text).not.toContain('$70');
		expect(text).not.toContain('server-rendered in vrbo.html');
		expect(text).not.toContain('over 100 five out of 5 star reviews');
		expect(text).not.toContain('sleeps 14-17*');
		expect(text).not.toContain('17 guests usually requires sleeping');
		expect(text).not.toContain('snippets_TODO');
		expect(text).not.toContain('host_claim');
	});

	it('does not publish a prerender data file', () => {
		expect(existsSync(join(root, '__data.json'))).toBe(false);
		const dataFiles = existsSync(root)
			? walk(root).filter((file) => file.endsWith('__data.json') || file.includes('__data.json'))
			: [];
		expect(dataFiles).toEqual([]);
	});
});
