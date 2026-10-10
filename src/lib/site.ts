/** Canonical origin until a custom domain is chosen. Override at build time with PUBLIC_SITE_URL. */
export const DEFAULT_SITE_URL = 'https://second-star-villa.vercel.app';

/**
 * Normalize a site origin. Empty input uses the default. Trailing slashes are removed.
 * A path is kept (for a non-root deploy); query, hash, and credentials are rejected.
 */
export function resolveSiteUrl(raw?: string | null): string {
	const trimmed = (raw ?? '').trim();
	const candidate = trimmed || DEFAULT_SITE_URL;
	let parsed: URL;
	try {
		parsed = new URL(candidate);
	} catch {
		throw new Error(`PUBLIC_SITE_URL must be an absolute http(s) URL, got "${candidate}"`);
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new Error(`PUBLIC_SITE_URL must be an absolute http(s) URL, got "${candidate}"`);
	}
	if (parsed.username || parsed.password || parsed.search || parsed.hash) {
		throw new Error(
			'PUBLIC_SITE_URL must be an origin (and optional path) without credentials, query, or hash'
		);
	}
	const path = parsed.pathname.replace(/\/+$/, '');
	return `${parsed.origin}${path === '/' ? '' : path}`;
}

function publicSiteUrlFromEnv(): string | undefined {
	const env = import.meta.env as unknown as Record<string, string | boolean | undefined>;
	const value = env.PUBLIC_SITE_URL;
	return typeof value === 'string' ? value : undefined;
}

// TODO(owner): set PUBLIC_SITE_URL to the custom domain once chosen.
export const SITE_URL = resolveSiteUrl(publicSiteUrlFromEnv());

export const TITLE =
	'Second Star to the Right | 7-Bedroom Pool Villa with Game Room near Disney, Kissimmee';
export const DESCRIPTION =
	'7-bedroom, 5.5-bath Grand Collection villa sleeping up to 17 at gated Windsor at Westside, Kissimmee FL. Private heated pool and spa, karaoke and DJ-light game room, 11 smart TVs, 800 ft to the resort clubhouse, about 20 minutes to Disney\'s Animal Kingdom. Rated 9.6/10 on Vrbo.';
