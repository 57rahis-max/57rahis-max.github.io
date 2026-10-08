import { SITE, postUrl, authorUrl, categoryUrl } from './site';
import type { Post } from './posts';
import { lastTouched } from './posts';

const abs = (p: string) => new URL(p, SITE.url).href;

export const publisher = {
  '@type': 'NewsMediaOrganization',
  '@id': `${SITE.url}/#org`,
  name: SITE.name,
  url: SITE.url,
  logo: { '@type': 'ImageObject', url: abs('/logo.png'), width: 600, height: 60 },
  publishingPrinciples: abs('/editorial-standards/'),
  correctionsPolicy: abs('/corrections/'),
  ethicsPolicy: abs('/editorial-standards/'),
};

export const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  name: SITE.name,
  url: SITE.url,
  publisher: { '@id': `${SITE.url}/#org` },
};

export function person(id: string, a: { name: string; role: string; bio: string }) {
  return { '@type': 'Person', '@id': `${abs(authorUrl(id))}#person`, name: a.name, jobTitle: a.role, description: a.bio, url: abs(authorUrl(id)), worksFor: { '@id': `${SITE.url}/#org` } };
}

/** NewsArticle for every story; LiveBlogPosting (a NewsArticle subtype per Google) for live coverage. */
export function articleSchema(post: Post, author: { id: string; name: string; role: string; bio: string }, bodyText: string) {
  const d = post.data;
  const url = abs(postUrl(post.id));
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': d.updates.length ? 'LiveBlogPosting' : 'NewsArticle',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: d.title.slice(0, 110),
    description: d.description,
    datePublished: d.date.toISOString(),
    dateModified: lastTouched(post).toISOString(),
    author: [person(author.id, author)],
    publisher,
    articleSection: d.category,
    keywords: d.tags.map((t) => t.replace(/<[^>]*>/g, '').trim()).filter(Boolean).join(', ') || undefined,
    isAccessibleForFree: true,
    inLanguage: 'en-US',
    wordCount: bodyText.split(/\s+/).filter(Boolean).length,
    image: d.image ? [{ '@type': 'ImageObject', url: abs(d.image.src), caption: d.image.caption ?? d.image.alt }] : [abs('/og-default.png')],
    citation: d.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title ?? s.name, url: s.url, publisher: { '@type': 'Organization', name: s.name } })),
  };
  if (d.updates.length) {
    const times = d.updates.map((u) => u.time.getTime());
    base.coverageStartTime = new Date(Math.min(...times)).toISOString();
    if (d.live === 'ended') base.coverageEndTime = new Date(Math.max(...times)).toISOString();
    base.liveBlogUpdate = d.updates.map((u, i) => ({
      '@type': 'BlogPosting',
      '@id': `${url}#update-${d.updates.length - i}`,
      headline: u.title ?? d.title.slice(0, 110),
      datePublished: u.time.toISOString(),
      articleBody: u.body.replace(/<[^>]+>/g, ''),
      url: `${url}#update-${d.updates.length - i}`,
    }));
  }
  return base;
}

export function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.url) })),
  };
}

export const crumbsFor = (post: Post) => breadcrumbs([
  { name: 'Home', url: '/' },
  { name: post.data.category, url: categoryUrl(post.data.category) },
  { name: post.data.title, url: postUrl(post.id) },
]);
