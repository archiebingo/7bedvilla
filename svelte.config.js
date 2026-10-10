import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ strict: true }),
		prerender: { handleHttpError: 'fail' },
		// Inline the stylesheet so the LCP image is not stuck behind a render-blocking CSS request.
		inlineStyleThreshold: 32768
	}
};
