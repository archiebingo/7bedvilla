import { llmsTxt } from '$lib/llms';
import { content } from '$lib/server/content';

export const prerender = true;

export function GET() {
	return new Response(llmsTxt(content), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
