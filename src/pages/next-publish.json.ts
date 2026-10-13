// When the next scheduled story is due, for the scheduler worker
// (scheduler/worker.js): it asks GitHub to rebuild only when this time has
// passed. Only the time is published, never which story it is.
import { getCollection } from 'astro:content';

export async function GET() {
  const now = Date.now();
  const due = (await getCollection('posts', ({ data }) => !data.draft && data.date.getTime() > now))
    .map((p) => p.data.date.getTime())
    .sort((a, b) => a - b);
  const body = JSON.stringify({ built: new Date(now).toISOString(), next: due.length ? new Date(due[0]).toISOString() : null });
  return new Response(body, { headers: { 'Content-Type': 'application/json' } });
}
