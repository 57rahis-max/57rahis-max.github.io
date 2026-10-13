// Max Crime scheduler: a Cloudflare Worker with a cron trigger.
//
// GitHub's own scheduled workflows are best-effort and can skip hours (on
// 2026-10-12 the 15-minute schedule ran once in eleven hours), so a story
// scheduled for 23:50 could go live at 03:20. Every five minutes this worker
// reads https://maxcrime.com/next-publish.json and, if the next scheduled
// story is due, starts the deploy workflow. When nothing is due it does
// nothing, so it costs no builds.
//
// Setup (Cloudflare dashboard): Workers & Pages > Create > Worker, paste this
// file, Deploy. Settings > Variables and Secrets > add a Secret named
// GH_TOKEN (a fine-grained GitHub token for 57rahis-max/57rahis-max.github.io
// with "Actions: Read and write" only). Settings > Triggers > Cron: */5 * * * *

const REPO = '57rahis-max/57rahis-max.github.io';

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env));
  },
};

async function run(env) {
  const res = await fetch(`https://maxcrime.com/next-publish.json?t=${Date.now()}`, { cf: { cacheTtl: 0 } });
  if (!res.ok) return console.log('next-publish.json', res.status);
  const { next } = await res.json();
  if (!next || Date.parse(next) > Date.now()) return console.log('nothing due; next', next);

  // A deploy already queued or running will publish it; do not start another.
  const gh = { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'maxcrime-scheduler', 'X-GitHub-Api-Version': '2022-11-28' };
  for (const status of ['queued', 'in_progress']) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/deploy.yml/runs?status=${status}&per_page=1`, { headers: gh });
    if (r.ok && (await r.json()).total_count > 0) return console.log('deploy already', status);
  }
  const d = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/deploy.yml/dispatches`, { method: 'POST', headers: gh, body: JSON.stringify({ ref: 'main' }) });
  console.log('dispatch', d.status, 'for', next);
}
