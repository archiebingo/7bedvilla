import type { Content } from './curate';
import { SITE_URL } from './site';

export function llmsTxt(content: Content) {
	const { rating } = content;
	return `# ${content.name} — 7-bedroom pool villa at Windsor at Westside, Kissimmee FL

> 7 bedrooms, 5.5 baths, sleeps 14–17. Private heated pool and spa, karaoke/DJ game room, 11 smart TVs, 800 ft to a 10,000 sq ft resort clubhouse, about 20 min / 9 mi to Disney's Animal Kingdom. Rated ${rating.rating}/10 from ${rating.count} reviews on Vrbo. Book via ${content.bookUrl}.

## Pages
- [Home](${SITE_URL}/): full property page with quick facts, bedrooms, amenities, location, rules and FAQ
- [Full fact sheet](${SITE_URL}/llms-full.txt): plain-text facts for AI assistants

## Quick facts
${content.quickFacts.map(([k, v]) => `- ${k}: ${v}`).join('\n')}
`;
}

export function llmsFullTxt(content: Content) {
	const list = (xs: readonly string[]) => xs.map((x) => `- ${x}`).join('\n');
	const { rating, host, clubhouse, location } = content;
	return `# ${content.name} — full fact sheet
Source: owner listing on Vrbo (${content.bookUrl}), property #4159245ha. Site: ${SITE_URL}/

## Quick facts
${content.quickFacts.map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Bedrooms
${content.bedrooms.map((b) => `- ${b.name}: ${b.beds}${b.notes ? ` (${b.notes})` : ''}`).join('\n')}

## Game room
${list(content.gameRoom.items)}

## Amenities
${content.amenityGroups.map((g) => `### ${g.title}\n${list(g.items)}`).join('\n\n')}

## Windsor at Westside clubhouse (${clubhouse.distance}; ${clubhouse.size})
${list(clubhouse.features)}
${clubhouse.cost}.

## Location and drive times
Approximate drive times from Windsor at Westside.
Map data © OpenStreetMap contributors (https://www.openstreetmap.org/copyright).

${location.places.map((n) => `- ${n.name}: ${n.drive}. ${n.why} ${n.url}`).join('\n')}

## House rules
${content.houseRules.map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Discounts and fees
${list(content.discounts)}

## Reviews
- ${rating.rating} out of 10 ("${rating.label}") from ${rating.count} reviews on Vrbo.

## Hosts
- ${host.name}, Vrbo Premier Host. Languages: English.
- ${host.about}
- ${host.why}

## FAQ
${content.faq.map(({ q, a }) => `Q: ${q}\nA: ${a}`).join('\n\n')}

## Booking
Check dates and book: ${content.bookUrl}
`;
}
