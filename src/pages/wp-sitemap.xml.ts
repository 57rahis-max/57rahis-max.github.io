// An address a search engine may already have from the WordPress site (or the
// first Astro build); it serves the sitemap index.
import { sitemapIndex } from '../lib/sitemap';
export const GET = sitemapIndex;
