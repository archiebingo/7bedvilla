import { SITE_URL } from '$lib/site';

export const prerender = true;

export function GET() {
	const urls = ['/', '/llms.txt', '/llms-full.txt'];
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>2026-10-09</lastmod></url>`).join('\n')}
</urlset>
`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
