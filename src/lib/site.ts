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
	'Luxury 7-Bedroom Villa Rental near Disney | 7 Bed Villa';
export const DESCRIPTION =
	'Luxury 7-bedroom villa rental in Windsor at Westside, Kissimmee, near Disney. Sleeps up to 17 with a private pool, spa and game room for family and group getaways.';
