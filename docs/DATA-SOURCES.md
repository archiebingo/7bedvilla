# Location data

Guest-facing copy on the site says “Approximate drive times from Windsor at Westside” and credits map data to [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). This note is where the methods live.

Checked 10 Oct 2026.

## Public coordinate

The listing point in `src/lib/data/listing.json` stays the precise source coordinate. Everything public uses that point rounded to 3 decimals: **28.313, -81.647** (about 100 m). That includes JSON-LD `geo`, the Google Maps link, the star on both maps, and `nearby.json` `origin`. Map coordinates in the SVG are then rounded to 1 decimal so the star’s translation does not restore the listing point.

Drive times are OSRM car routes from that rounded point, not from the resort clubhouse. The clubhouse is about 800 feet from the villa; the precise listing point is a house coordinate, so the page does not call the drive origin the clubhouse.

## Drive times

[OSRM](https://project-osrm.org/) `table` service, `driving` profile, uncongested. Minutes under 15 round to the nearest minute; 15 and above round to the nearest 5. Miles round to the nearest mile. The strings are `about N min / M mi`.

Orlando International (MCO) routes to about **50 min / 30 mi**. That is the checked figure. The older listing line of about 40 minutes is not what the route returns, and the page keeps the 50-minute figure. Kissimmee Gateway (ISM) stays the listing’s “about 31 minutes”; it was not re-routed.

## Places

Eighteen places, each with an https URL that was fetched on the check date. Pin coordinates come from OpenStreetMap, Nominatim, Photon, or the U.S. Census geocoder, as noted on each `source` in `src/lib/data/nearby.json`. Those notes are not rendered.

Disney Springs is shopping and dining (`dining`), not a theme park. No theme-park ticket is required.

Posner Commons is not listed. `https://shopposnercommons.com/` did not serve the center (the host presented a default certificate, and the page was not a store). The shopping slot is **Orlando Vineland Premium Outlets**, 8200 Vineland Ave, Orlando, FL 32821. Photon names that point Orlando Vineland Premium Outlets. The official page `https://www.premiumoutlets.com/outlet/orlando-vineland` returned HTTP 200 and shows the same address. The drive from the rounded point is about 30 min / 15 mi.

## Basemap

`tile.openstreetmap.org` forbids bulk download and offline or static use of its tiles, so the maps are not stitched tile images. `scripts/build-basemap.py` draws roads and lakes in Web Mercator from the compact extract in `scripts/data/` (`roads.json`, `water.json`, `towns.json`). The extract covers the regional frame plus a margin, so I-4, SR-429, and US-27 are not cut off where the frame continues. SR-429’s southern end is the I-4 interchange; that terminus is on the map. The SVG files are geometry only.

Town, road, and pin labels are placed together in `src/lib/area-map.ts` from Chrome-measured glyph boxes in `src/lib/data/label-metrics.json` (`scripts/measure-labels.mjs`). A lower-priority label is skipped instead of drawn on top of another label or a pin. Pin labels come first, then towns, then roads. The ChampionsGate town label is omitted because the golf pin already says ChampionsGate. Rebuild the geometry and label seeds with:

```
python3 scripts/build-basemap.py
```

The script does not download tiles or call Overpass. `--rebuild-cache` is only for refreshing `scripts/data/` from a local Overpass dump.
