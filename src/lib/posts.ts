import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export async function allPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => sortTime(b) - sortTime(a));
}

/**
 * Where a story sits in the lists: its publish date, or for a live story its
 * newest update. An old story corrected later does not jump to the top.
 */
export function sortTime(p: Post): number {
  return (p.data.live === 'live' ? lastTouched(p) : p.data.date).getTime();
}

/** The newest of the publish date, the last edit, and the latest live update. */
export function lastTouched(p: Post): Date {
  const times = [p.data.date, p.data.updated, ...p.data.updates.map((u) => u.time)].filter(Boolean) as Date[];
  return new Date(Math.max(...times.map((t) => t.getTime())));
}

/** Related stories: same category or shared tags, never the story itself. */
export function related(post: Post, posts: Post[], n = 3): Post[] {
  const score = (p: Post) =>
    (p.data.category === post.data.category ? 1 : 0) + p.data.tags.filter((t) => post.data.tags.includes(t)).length * 2;
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || sortTime(b.p) - sortTime(a.p))
    .slice(0, n)
    .map((x) => x.p);
}
