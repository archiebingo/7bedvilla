import listing from '../data/listing.json';
import { curate } from '../curate';

/** Prerender-time view of the listing. Do not import this from client components. */
export const content = curate(listing);
