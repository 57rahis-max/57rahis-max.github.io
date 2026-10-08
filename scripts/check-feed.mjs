// Runs after the build: the full-text feed at /feed/ (and /rss.xml) must meet
// NewsBreak's feed specification, or the deploy stops. Feed partners reject a
// broken feed silently, so it is checked here instead.
import { readFileSync } from 'node:fs';

const xml = readFileSync('dist/feed/index.xml', 'utf8');
const problems = [];
if (xml !== readFileSync('dist/rss.xml', 'utf8')) problems.push('/rss.xml differs from /feed/');
for (const ns of ['xmlns:nb="https://www.newsbreak.com/"', 'xmlns:dc="http://purl.org/dc/elements/1.1/"', 'xmlns:content="http://purl.org/rss/1.0/modules/content/"'])
  if (!xml.includes(ns)) problems.push(`missing namespace ${ns}`);
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
if (!items.length) problems.push('the feed has no items');
for (const it of items) {
  const title = (it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '(no title)';
  for (const tag of ['title', 'link', 'guid', 'pubDate', 'dc:creator', 'description', 'content:encoded'])
    if (!new RegExp(`<${tag}[^>]*>\\s*\\S[\\s\\S]*?</${tag}>`).test(it)) problems.push(`${title}: missing <${tag}>`);
  const link = (it.match(/<link>([^<]*)<\/link>/) || [])[1] || '';
  if (!/^https:\/\/maxcrime\.com\/[a-z0-9-]+\/$/.test(link)) problems.push(`${title}: link is not a canonical article URL (${link})`);
  const pub = (it.match(/<pubDate>([^<]*)<\/pubDate>/) || [])[1];
  if (!pub || isNaN(Date.parse(pub))) problems.push(`${title}: pubDate is not a date`);
  const body = (it.match(/<content:encoded><!\[CDATA\[([\s\S]*)\]\]><\/content:encoded>/) || [])[1] || '';
  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (words < 100) problems.push(`${title}: content:encoded has only ${words} words; the feed must carry the full article`);
  const rel = body.match(/(?:href|src)="\/(?!\/)[^"]*"/);
  if (rel) problems.push(`${title}: relative URL in content (${rel[0]})`);
  if (/<script(?![^>]*platform\.twitter\.com)|\son[a-z]+\s*=|javascript:/i.test(body)) problems.push(`${title}: executable markup in content`);
  const srcs = [...body.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(srcs).size !== srcs.length) problems.push(`${title}: the same image appears twice`);
  if (/<iframe(?![^>]*class="nb-(?:video|audio)")/.test(body)) problems.push(`${title}: an iframe without class="nb-video" or "nb-audio"`);
}
if (problems.length) { console.error('Feed checks failed:\n' + problems.map((p) => '  - ' + p).join('\n')); process.exit(1); }
console.log(`Feed checks passed (${items.length} items, full text).`);
