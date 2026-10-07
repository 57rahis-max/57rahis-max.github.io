import type { APIRoute } from 'astro';
import { allPosts, lastTouched } from '../../lib/posts';

// A tiny stamp per live story so a reader's browser can ask "is there a
// newer version?" without downloading and parsing the whole page.
export async function getStaticPaths() {
  const posts = await allPosts();
  return posts.filter((p) => p.data.updates.length > 0).map((p) => ({ params: { slug: p.id }, props: { p } }));
}

export const GET: APIRoute = ({ props }) => {
  const { p } = props as { p: Awaited<ReturnType<typeof allPosts>>[number] };
  const body = JSON.stringify({ newest: lastTouched(p).toISOString(), status: p.data.live ?? 'ended', updates: p.data.updates.length });
  return new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
};
