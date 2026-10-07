import rss from '@astrojs/rss';
import { allPosts, lastTouched } from '../lib/posts';
import { SITE, postUrl } from '../lib/site';

export async function GET(context: { site: URL }) {
  const posts = await allPosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site,
    items: posts.slice(0, 50).map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: lastTouched(p),
      link: postUrl(p.id),
      categories: [p.data.category, ...p.data.tags],
    })),
  });
}
