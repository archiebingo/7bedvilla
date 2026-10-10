import { SITE_URL } from '$lib/site';

export const prerender = true;

const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'Googlebot', 'Bingbot'];

export function GET() {
	const body = [
		...bots.map((b) => `User-agent: ${b}\nAllow: /\n`),
		'User-agent: *\nAllow: /\n',
		`Sitemap: ${SITE_URL}/sitemap.xml`,
		''
	].join('\n');
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
