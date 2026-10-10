import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// PUBLIC_ is the SvelteKit public-env prefix. Vite only exposes VITE_ unless this is set,
	// and PUBLIC_SITE_URL is read from import.meta.env in src/lib/site.ts.
	envPrefix: ['VITE_', 'PUBLIC_'],
	test: { include: ['tests/**/*.test.ts'] }
});
