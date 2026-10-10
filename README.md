# Second Star to the Right — villa website

Static SvelteKit + Tailwind site (adapter-static, fully prerendered) for the 7-bedroom Windsor at Westside villa in Kissimmee, FL. v1 booking path: https://www.vrbo.com/4159245ha

- Property facts come from `src/lib/data/listing.json` (extracted from the Vrbo page) and `PRODUCT-INTENT.md`. Nearby drives and the location map come from `src/lib/data/nearby.json` (verified places and drive times). Both are read only on the server (`src/lib/server/content.ts`); the page renders the curated result. TODO fields are not rendered. How the drives and basemap were built is in `docs/DATA-SOURCES.md`. Regenerate the map geometry with `python3 scripts/build-basemap.py`.
- SEO: title/meta, canonical, OG/Twitter, JSON-LD (VacationRental, FAQPage, BreadcrumbList), `/sitemap.xml`, `/robots.txt`.
- AI: `/llms.txt`, `/llms-full.txt`, Quick facts `<dl>`, FAQ; robots allow GPTBot, ClaudeBot, PerplexityBot, Google-Extended.
- Photos self-hosted as WebP (800w + 1600w) in `static/photos/`.
- Canonical origin defaults to `https://second-star-villa.vercel.app`. Override it in one place at build time: `PUBLIC_SITE_URL=https://example.com npm run build` (`resolveSiteUrl` in `src/lib/site.ts`).

```
npm ci && npm test && npm run lint && npm run check && npm run build
npm run dev
```

`npm run build` writes the static site to `build/`. `npm run dev` serves the local preview.
