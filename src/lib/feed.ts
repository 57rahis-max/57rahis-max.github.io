/**
 * The site's full-text RSS 2.0 feed, built to NewsBreak's feed specification
 * ("NewsBreak RSS and MRSS Specifications"), which also suits Google News,
 * Flipboard, Feedly and any other reader:
 *   - namespaces nb, dc, content (and media for the optional thumbnail)
 *   - every item: title, link (canonical), pubDate, dc:creator, description,
 *     content:encoded with the whole article as HTML: images as
 *     <figure><img><figcaption>, video as <iframe class="nb-video">, X posts
 *     as their embed code, and every hyperlink
 *   - guid as the permalink; media:thumbnail as the article's image
 * Every URL is absolute, because the feed is read on other sites.
 */
import { getEntry } from 'astro:content';
import { allPosts, lastTouched, sortedUpdates, type Post } from './posts';
import { SITE, postUrl, fmtDateTime } from './site';
import { sanitizeCredit, sanitizeUpdate } from './html';

const abs = (p: string) => new URL(p, SITE.url).href;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** CDATA cannot contain "]]>"; split it so the section stays well-formed. */
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
/** Site-relative links and images become absolute. */
const absolutize = (html: string) => html.replace(/\b(href|src)="\/(?!\/)/g, `$1="${SITE.url}/`);

function articleHtml(p: Post): string {
  const d = p.data;
  const parts: string[] = [];
  if (d.image) {
    const cap = [d.image.caption ? esc(d.image.caption) : '', d.image.credit ? sanitizeCredit(d.image.credit) : ''].filter(Boolean).join(' ');
    parts.push(`<figure><img src="${abs(d.image.src)}" alt="${esc(d.image.alt)}">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`);
  }
  const updates = sortedUpdates(p);
  if (updates.length) {
    parts.push(`<h2>${d.live === 'live' ? 'Live updates' : 'Updates'}</h2>`);
    for (const u of updates) parts.push(`<p><strong>${esc(fmtDateTime(u.time))}${u.title ? `: ${esc(u.title)}` : ''}</strong></p>${sanitizeUpdate(u.body)}`);
  }
  parts.push(absolutize(p.rendered?.html ?? ''));
  for (const e of d.embeds) {
    if (e.type === 'youtube') parts.push(`<iframe class="nb-video" src="https://www.youtube.com/embed/${e.id}" title="${esc(e.title)}" allowfullscreen></iframe>${e.caption ? `<p><em>${esc(e.caption)}</em></p>` : ''}`);
    else if (e.type === 'x') parts.push(`<blockquote class="twitter-tweet"><p lang="en" dir="ltr">${esc(e.text)}</p>&mdash; ${esc(e.author)} <a href="${esc(e.url)}">${esc(e.date)}</a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`);
    else parts.push(`<blockquote><p>${esc(e.text)}</p><cite>${esc(e.cite)}${e.source ? `, according to ${esc(e.source)}` : ''}</cite></blockquote>`);
  }
  if (d.sources.length) {
    parts.push('<h2>Sources</h2><ul>' + d.sources.map((s) => `<li><a href="${esc(s.url)}">${esc(s.name)}${s.title ? `: ${esc(s.title)}` : ''}</a>${s.date ? ` (${esc(s.date)})` : ''}</li>`).join('') + '</ul>');
  }
  return parts.join('\n');
}

export async function feedXml(): Promise<string> {
  const posts = (await allPosts()).slice(0, 50);
  const names = new Map<string, string>();
  for (const p of posts) if (!names.has(p.data.author.id)) names.set(p.data.author.id, (await getEntry(p.data.author))?.data.name ?? SITE.name);
  const newest = posts.length ? new Date(Math.max(...posts.map((p) => lastTouched(p).getTime()))) : new Date();
  const items = posts.map((p) => {
    const d = p.data;
    const url = abs(postUrl(p.id));
    return `    <item>
      <title>${esc(d.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${d.date.toUTCString()}</pubDate>
      <dc:creator>${esc(names.get(d.author.id)!)}</dc:creator>
      <description>${esc(d.description)}</description>
      <category>${esc(d.category)}</category>${d.tags.map((t) => `\n      <category>${esc(t.replace(/<[^>]*>/g, ''))}</category>`).join('')}${d.image ? `\n      <media:thumbnail url="${abs(d.image.src)}"/>` : ''}
      <content:encoded>${cdata(articleHtml(p))}</content:encoded>
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:nb="https://www.newsbreak.com/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${SITE.url}/</link>
    <description>${esc(SITE.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE.url}/feed/" rel="self" type="application/rss+xml"/>
    <image><url>${abs('/logo.png')}</url><title>${esc(SITE.name)}</title><link>${SITE.url}/</link></image>
${items.join('\n')}
  </channel>
</rss>
`;
}

export const feedResponse = async () =>
  new Response(await feedXml(), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
