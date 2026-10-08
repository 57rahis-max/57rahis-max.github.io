// Pre-publish checks that run in CI before every deploy. A failure blocks the
// deploy, so a story that breaks a newsroom rule, or would ship broken, never
// goes live.
//
// Two layers:
//   1. Integrity — every post, imported or new: the frontmatter parses, the
//      author exists, every referenced image file exists, dates are sane.
//      A missing image built cleanly and shipped a dead og:image (2026-10-08).
//   2. Newsroom rules — new posts only (WordPress imports were edited under
//      the old process): dates carry years, charges carry the presumption
//      notice, no relative-time wording.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { load as yaml } from 'js-yaml';

const dir = 'src/content/posts';
const problems = [];
const authors = new Set(JSON.parse(readFileSync('src/content/authors/authors.json', 'utf8')).map((a) => a.id));
const MONTH_DAY = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})\b(?!,? \d{4})(?!\d)/;
const CHARGED = /\b(?:charged with|faces? (?:\w+ ){0,3}charges?|facing (?:\w+ ){0,3}charges?|was charged|been charged|accused of|indicted)\b/i;
const RESOLVED = /not been proven|presumed innocent|\b(?:convicted|pleaded guilty|found guilty|sentenced|acquitted)\b/i;
const RELATIVE = /\b(latest|so far|to date|currently|right now)\b/i;
const now = Date.now();
const slugs = new Set();

for (const f of readdirSync(dir).filter((f) => /\.mdx?$/.test(f))) {
  const src = readFileSync(`${dir}/${f}`, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { problems.push(`${f}: no frontmatter block`); continue; }
  const [, fmText, body] = m;
  let fm;
  try { fm = yaml(fmText); } catch (e) { problems.push(`${f}: frontmatter is not valid YAML (${e.message.split('\n')[0]})`); continue; }

  // --- Integrity: every post ---
  const slug = f.replace(/\.mdx?$/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) problems.push(`${f}: file name must be a lowercase-hyphen slug (it becomes the URL)`);
  if (slugs.has(slug)) problems.push(`${f}: duplicate slug`);
  slugs.add(slug);
  if (!fm.title || typeof fm.title !== 'string') problems.push(`${f}: no title`);
  if (fm.title && fm.title.length > 200) problems.push(`${f}: title over 200 characters`);
  if (!fm.description) problems.push(`${f}: no description`);
  if (fm.description && fm.description.length > 160) problems.push(`${f}: description over 160 characters (search engines cut it)`);
  if (fm.seoTitle && fm.seoTitle.length > 70) problems.push(`${f}: seoTitle over 70 characters`);
  if (!authors.has(fm.author)) problems.push(`${f}: author "${fm.author}" is not in authors.json (${[...authors].join(', ')})`);
  const date = new Date(fm.date);
  if (isNaN(date)) problems.push(`${f}: date "${fm.date}" is not a valid date`);
  else if (date.getTime() > now + 24 * 3600 * 1000) problems.push(`${f}: date is in the future (${fm.date})`);
  if (fm.updated && new Date(fm.updated) < date) problems.push(`${f}: updated is before date`);
  const imgs = [];
  if (fm.image) {
    if (!fm.image.src) problems.push(`${f}: image has no src`);
    else imgs.push(fm.image.src);
    if (!fm.image.alt || !String(fm.image.alt).trim()) problems.push(`${f}: image without alt text`);
  }
  for (const s of body.matchAll(/(?:src|href)="(\/images\/[^"]+)"/g)) imgs.push(s[1]);
  for (const s of body.matchAll(/!\[[^\]]*\]\((\/images\/[^)]+)\)/g)) imgs.push(s[1]);
  for (const i of new Set(imgs)) if (!existsSync(`public${i.split('?')[0]}`)) problems.push(`${f}: image file does not exist: ${i}`);
  for (const s of fm.sources ?? []) {
    if (!s.url || !/^https?:\/\//.test(s.url)) problems.push(`${f}: source "${s.name}" has no http(s) url`);
    if (!s.name) problems.push(`${f}: a source has no name`);
  }
  if (fm.live && !['live', 'ended'].includes(fm.live)) problems.push(`${f}: live must be "live" or "ended"`);
  if (fm.live === 'live' && !(fm.updates ?? []).length) problems.push(`${f}: live: live but no updates`);
  for (const u of fm.updates ?? []) {
    if (isNaN(new Date(u.time))) problems.push(`${f}: an update has an invalid time`);
    if (!u.body) problems.push(`${f}: an update has no body`);
  }

  // --- Newsroom rules: new posts only ---
  if (fm.wpId) continue;
  const text = body.replace(/<[^>]+>/g, ' ').replace(/"[^"]*"|“[^”]*”/g, ' ');
  const md = MONTH_DAY.exec(text);
  if (md && /^[A-Z]/.test(md[0])) problems.push(`${f}: date without a year: "${md[0]}"`);
  if (CHARGED.test(text) && !RESOLVED.test(body)) problems.push(`${f}: charges reported without "The allegations have not been proven in court."`);
  const rel = RELATIVE.exec(text);
  if (rel) problems.push(`${f}: relative-time wording ("${rel[1]}")`);
  if (!(fm.sources ?? []).length) problems.push(`${f}: a new story needs at least one source`);
}

if (problems.length) {
  console.error('Content checks failed:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(`Content checks passed (${slugs.size} posts).`);
