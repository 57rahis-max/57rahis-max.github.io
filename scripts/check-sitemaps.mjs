// Runs after the build: the sitemaps must list every public page exactly once,
// list nothing that is not a page, and carry valid dates, or the deploy stops.
// Search engines report a bad sitemap only in their consoles, so it is
// checked here instead.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://maxcrime.com';
const read = (f) => readFileSync(join('dist', f), 'utf8');
const problems = [];

const INDEX = 'sitemap-index.xml';
const index = read(INDEX);
for (const alias of ['sitemap.xml', 'sitemap_index.xml', 'wp-sitemap.xml', 'sitemap-0.xml'])
  if (read(alias) !== index) problems.push(`/${alias} is not the sitemap index`);
if (read('sitemap-news.xml') !== read('news-sitemap.xml')) problems.push('/sitemap-news.xml is not the news sitemap');

const children = [...index.matchAll(/<sitemap><loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!children.length) problems.push('the sitemap index lists no sitemaps');
const seen = new Map();
for (const loc of children) {
  if (!loc.startsWith(SITE + '/')) { problems.push(`index entry is off-site: ${loc}`); continue; }
  const file = loc.slice(SITE.length + 1);
  if (!existsSync(join('dist', file))) { problems.push(`index lists ${file}, which was not built`); continue; }
  const xml = read(file);
  if (!xml.startsWith('<?xml') || !/<urlset [^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(xml)) problems.push(`${file}: not a sitemap urlset`);
  if (/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml)) problems.push(`${file}: an unescaped &`);
  for (const [, url] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (url.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
    for (const [, d] of url.matchAll(/<(?:lastmod|news:publication_date)>([^<]+)</g))
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(d) || isNaN(Date.parse(d)) || Date.parse(d) > Date.now() + 60_000) problems.push(`${file}: bad or future date ${d} for ${loc}`);
    for (const [, img] of url.matchAll(/<image:loc>([^<]+)<\/image:loc>/g))
      if (!img.startsWith(SITE + '/images/') || !existsSync(join('public', img.slice(SITE.length)))) problems.push(`${file}: image ${img} is not a site image`);
    if (file === 'news-sitemap.xml') continue; // the news sitemap repeats recent stories by design
    if (!/^https:\/\/maxcrime\.com\/(?:[a-z0-9-]+\/)*$/.test(loc)) { problems.push(`${file}: not a canonical URL: ${loc}`); continue; }
    if (seen.has(loc)) problems.push(`${loc} is listed twice (${seen.get(loc)} and ${file})`);
    seen.set(loc, file);
  }
}

// Every built page except search and 404 must be in a sitemap, and nothing else.
const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html') pages.push(SITE + '/' + p.slice('dist/'.length, -'index.html'.length));
  }
})('dist');
for (const url of pages) {
  if (/\/(?:search|404|pagefind)\/$/.test(url)) continue;
  if (!seen.has(url)) problems.push(`page missing from the sitemaps: ${url}`);
}
for (const url of seen.keys()) if (!pages.includes(url)) problems.push(`sitemap lists a URL with no page: ${url}`);

const robots = read('robots.txt');
if (!robots.includes(`Sitemap: ${SITE}/${INDEX}`)) problems.push('robots.txt does not point to the sitemap index');

if (problems.length) {
  console.error('Sitemap checks failed:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`Sitemap checks passed (${seen.size} URLs in ${children.length} sitemaps).`);
