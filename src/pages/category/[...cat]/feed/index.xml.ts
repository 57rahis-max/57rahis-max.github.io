// /category/<slug>/feed/ — WordPress's per-category feed, a 404 after the
// move off WordPress. Built for every category that has a page.
import { allPosts } from '../../../../lib/posts';
import { CATEGORIES } from '../../../../lib/categories';
import { categoryFeedResponse } from '../../../../lib/feed';

export async function getStaticPaths() {
  const posts = await allPosts();
  return CATEGORIES.filter(({ name }) => posts.some((p) => p.data.category === name))
    .map(({ name, slug }) => ({ params: { cat: slug }, props: { name, slug } }));
}

export const GET = ({ props }: { props: { name: string; slug: string } }) => categoryFeedResponse(props);
