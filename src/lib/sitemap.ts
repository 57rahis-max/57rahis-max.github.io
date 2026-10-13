import { getCollection } from 'astro:content';
import { allPosts, lastTouched, type Post } from './posts';
import { SITE, slugify } from './site';

// The sitemaps, built from the same published list as every page, so a
// scheduled story is left out until it goes live. sitemap-index.xml lists
// the others; the addresses the WordPress site used (sitemap_index.xml,
// post-sitemap.xml, wp-sitemap.xml ...) serve the same files, so a sitemap
// already submitted to a search engine keeps working.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const abs = (path: string) => SITE.url + path;
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const newest = (posts: Post[]) => (posts.length ? new Date(Math.max(...posts.map((p) => lastTouched(p).getTime()))) : undefined);

type Url = { loc: string; lastmod?: Date; image?: string; news?: { title: string; date: Date } };

const STYLE = '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>';

function urlset(urls: Url[]): string {
  const body = urls.map((u) => {
    let x = `<url><loc>${esc(u.loc)}</loc>`;
    if (u.lastmod) x += `<lastmod>${iso(u.lastmod)}</lastmod>`;
    if (u.image) x += `<image:image><image:loc>${esc(u.image)}</image:loc></image:image>`;
    if (u.news) x += `<news:news><news:publication><news:name>${esc(SITE.name)}</news:name><news:language>en</news:language></news:publication><news:publication_date>${iso(u.news.date)}</news:publication_date><news:title>${esc(u.news.title)}</news:title></news:news>`;
    return x + '</url>';
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${STYLE}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${body}\n</urlset>\n`;
}

const xml = (body: string) => new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });

export async function postSitemap() {
  const posts = await allPosts();
  return xml(urlset(posts.map((p) => ({
    loc: abs(`/${p.id}/`),
    lastmod: lastTouched(p),
    image: p.data.image?.src ? abs(p.data.image.src) : undefined,
  }))));
}

export async function pageSitemap() {
  const posts = await allPosts();
  const live = posts.filter((p) => p.data.updates.length > 0);
  return xml(urlset([
    { loc: abs('/'), lastmod: newest(posts) },
    { loc: abs('/live/'), lastmod: newest(live) },
    { loc: abs('/about/') },
    { loc: abs('/editorial-standards/') },
    { loc: abs('/corrections/') },
    { loc: abs('/contact/') },
  ]));
}

/** The same sections src/pages/category/[cat].astro builds. */
export async function categorySitemap() {
  const posts = await allPosts();
  const cats = new Set(posts.map((p) => slugify(p.data.category)));
  cats.add('courts');
  return xml(urlset([...cats].map((slug) => ({
    loc: abs(`/category/${slug}/`),
    lastmod: newest(posts.filter((p) => slugify(p.data.category) === slug || (slug === 'courts' && p.data.tags.includes('courts')))),
  }))));
}

export async function authorSitemap() {
  const posts = await allPosts();
  const authors = await getCollection('authors');
  return xml(urlset(authors.map((a) => ({ loc: abs(`/author/${a.id}/`), lastmod: newest(posts.filter((p) => p.data.author.id === a.id)) }))));
}

/** Google News: stories published in the last two days, as Google asks. */
export async function newsSitemap() {
  const cutoff = Date.now() - 2 * 24 * 3600 * 1000;
  const posts = (await allPosts()).filter((p) => p.data.date.getTime() >= cutoff);
  return xml(urlset(posts.map((p) => ({ loc: abs(`/${p.id}/`), news: { title: p.data.title, date: p.data.date } }))));
}

export const SITEMAPS = ['post-sitemap.xml', 'page-sitemap.xml', 'category-sitemap.xml', 'author-sitemap.xml', 'news-sitemap.xml'];

export async function sitemapIndex() {
  const posts = await allPosts();
  const mod = newest(posts);
  const body = SITEMAPS.map((f) => `<sitemap><loc>${abs('/' + f)}</loc>${mod ? `<lastmod>${iso(mod)}</lastmod>` : ''}</sitemap>`).join('\n');
  return xml(`<?xml version="1.0" encoding="UTF-8"?>\n${STYLE}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`);
}
