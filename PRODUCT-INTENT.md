# Product Intent — Second Star to the Right (villa website)

- **Date:** 2026-10-09
- **Working title:** Second Star to the Right — 7-Bedroom Pool & Game-Room Villa at Windsor at Westside, Kissimmee
- **Mode:** new app (new repo `second-star-villa`)
- **Requested by:** Charles Corcoran — "Create a website that improves on this VRBO posting that is SEO and AI optimized."
- **Source of truth:** `src/lib/data/listing.json` (extracted from the VRBO page). No fact appears on the site unless it is in listing.json or this Intent.

## Problem
The VRBO page (4159245ha) is cluttered with platform chrome, generic auto-copy ("Beach equipment", "Centrally-located"), and a run-on 6,000-character description. The owner does not control it, cannot rank it for their own name, and it is weak as a source for search snippets and AI answers (VRBO's own JSON-LD reports occupancy 1 and has no amenities or FAQ).

## Who
Families and multi-family groups (up to 17 guests) planning Orlando / Disney / Universal trips who want a big pool home with a game room near the parks.

## JTBD
"When I'm planning a big-group Orlando trip, I want to quickly see whether this villa fits everyone, what's included, how far it is from the parks and what the rules are, so I can confidently check dates and book."

### JTBD list
1. Decide fit: bedrooms, beds, baths, how 17 actually sleep.
2. See the fun: private heated pool + spa, karaoke/DJ game room, 11 smart TVs, clubhouse 800 ft away.
3. Understand location: Animal Kingdom about 20 min / 9 mi, Magic Kingdom ticket center about 30 min / 14 mi, MCO about 50 min / 30 mi. ISM about 31 min is the listing figure and was not re-routed.
4. Know the rules: check-in 4 PM / out 10 AM, no pets, no events, smoking only on lanai, max cars, pool fence.
5. Know the deals: no resort fees, 10% returning/military/7+ nights (one per booking), free pool/spa heat (current special).
6. Check dates / book (v1: VRBO listing).
7. Get a correct answer from an AI assistant or Google for "7 bedroom villa near Disney with game room".

## Why now
Owner content already exists and rates 9.6/10 over 124 reviews; an owned, fast, structured page captures search and AI-answer traffic VRBO currently keeps.

## Done signal
Static SvelteKit site builds; single page with all sections + anchors; valid VacationRental + FAQPage + BreadcrumbList JSON-LD (tests pass); sitemap.xml, robots.txt, llms.txt, llms-full.txt present; Lighthouse mobile ≥95 perf/SEO/a11y/best-practices; every "Check dates" CTA opens https://www.vrbo.com/4159245ha; Charles approves the preview.

## Non-goals (v1)
- No booking engine, calendar, payments or price quotes.
- No invented reviews, ratings, prices, beds or distances.
- No Vercel deploy in this step (Release bot later).
- No disclaimer / CYA copy.

## Constraints
- Stack: SvelteKit + Tailwind, adapter-static, fully prerendered; vitest tests; lint/check/build clean.
- Mobile-first, Lighthouse 95+; self-hosted WebP photos (no hotlinking VRBO CDN), width/height set, lazy-load below the fold.
- Exclude third-party theme-park/character photos (Universal, Disney, SeaWorld) and the photo showing identifiable people.
- Content only from listing.json; TODO items render nothing (or an owner TODO in code comments), never placeholder facts.
- Rating: 9.6/10, 124 reviews, bestRating 10, attributed "on Vrbo".
- "Free pool heat" is described in the source as a current special — present as "currently free (special)".

## Priority hint
Medium-high: standalone, no dependency on table-edge.

## MoSCoW
- **Must:** hero + CTA, quick facts `<dl>`, highlights, game room, bedrooms & sleeping, amenities, clubhouse, location & drive times, reviews summary, house rules, discounts, FAQ, final CTA; title/meta/canonical/OG/Twitter; JSON-LD (VacationRental w/ containsPlace Accommodation, numberOfBedrooms 7, numberOfBathroomsTotal 5.5, occupancy 17, amenityFeature, geo, address Kissimmee FL, aggregateRating 9.6/124/10), FAQPage, BreadcrumbList; sitemap, robots (allow GPTBot, ClaudeBot, PerplexityBot, Google-Extended), llms.txt, llms-full.txt; tests.
- **Should:** photo gallery with host captions + descriptive alt; host section (James and Karen Smith, Premier Host); nearby restaurants list.
- **Could:** lightbox gallery; print-friendly fact sheet.
- **Won't (v1):** direct booking, availability calendar, prices, review widget.

## Open questions for Charles
1. Ownership / photo rights: VRBO lists the hosts as James and Karen Smith — is this Charles's property (or is he acting for them)? Confirm photos may be self-hosted.
2. Direct booking (phone/email/inquiry form) or keep VRBO as the only booking path?
3. Custom domain (canonical URL); placeholder used until decided.
4. Publish street address? Exact beds per room? Cancellation policy text? Real review snippets?
5. Parking: description says max 4 cars, amenity note says up to 5 vehicles per villa — which?

## References
- VRBO listing: https://www.vrbo.com/4159245ha (expediaPropertyId 33566395)
