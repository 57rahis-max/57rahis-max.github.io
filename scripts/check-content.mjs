// Pre-publish checks that run in CI before every deploy. A failure blocks the
// deploy, so a story that breaks a newsroom rule, or would ship broken, never
// goes live.
//
// Three layers:
//   1. Safety — the file is where and what it should be, and it carries
//      nothing executable. The build also sanitizes every body
//      (astro.config.mjs); this check fails loudly first, so a hostile story
//      is reported, not silently cleaned.
//   2. Integrity — every post, imported or new: the frontmatter parses, the
//      author exists, every referenced image file exists, dates are sane.
//      A missing image built cleanly and shipped a dead og:image (2026-10-08).
//   3. Newsroom rules — new posts only (WordPress imports were edited under
//      the old process): dates carry years, charges carry the presumption
//      notice, no relative-time wording, at least two sources.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { load as yaml } from 'js-yaml';

const dir = 'src/content/posts';
const problems = [];
const authors = new Set(JSON.parse(readFileSync('src/content/authors/authors.json', 'utf8')).map((a) => a.id));
const CATEGORIES = ['Crime News', 'Courts', 'News'];
const DESCRIPTION_MAX = 160;
const IMPORT_CUTOFF = new Date('2026-10-09T00:00:00Z'); // the WordPress import; nothing newer may claim wpId
const MONTH_DAY = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?\b(?!,? ?\d{4})(?!\d)(?! [A-Z][a-z]+ \d{4})/g;
const CHARGED = /\b(?:charged with|faces? (?:\w+ ){0,3}charges?|facing (?:\w+ ){0,3}charges?|was charged|been charged|accused of|indicted)\b/i;
const PRESUMPTION = /not been proven in court|presumed innocent/i;
const RESOLVED = /\b(?:convicted|pleaded guilty|found guilty|sentenced|acquitted)\b/i;
const RELATIVE = /\b(latest|so far|to date|currently|right now|yesterday|today|tonight|last night|this (?:morning|afternoon|evening|week|month)|recently|ongoing)\b/i;
// Anything executable or able to load a document. The build strips these too; here they fail the check.
const EXECUTABLE = /<\s*\/?\s*(?:script|iframe|object|embed|svg|style|link|meta|base|form|math|template)\b|\bon[a-z]+\s*=|javascript\s*:|data\s*:\s*text\/html|srcdoc\s*=|vbscript\s*:/i;
const now = Date.now();
const slugs = new Set();

// --- 1. Safety: the posts folder holds top-level .md files and nothing else ---
const walk = (d, depth = 0) => {
  for (const f of readdirSync(d)) {
    const p = `${d}/${f}`;
    if (statSync(p).isDirectory()) { problems.push(`${p}: a folder inside posts/ is not published, so a story there is never checked. Remove it.`); walk(p, depth + 1); continue; }
    if (f.startsWith('.')) continue;
    if (depth > 0 || !f.endsWith('.md')) problems.push(`${p}: only top-level .md files are stories (found ${depth > 0 ? 'a nested file' : 'a non-.md file'})`);
  }
};
walk(dir);
if (resolve(dir).split(sep).includes('..')) problems.push('posts dir path escapes the repo');

const strings = (v, out = []) => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
};

for (const f of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
  const src = readFileSync(`${dir}/${f}`, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { problems.push(`${f}: no frontmatter block`); continue; }
  const [, fmText, body] = m;
  let fm;
  try { fm = yaml(fmText); } catch (e) { problems.push(`${f}: frontmatter is not valid YAML (${e.message.split('\n')[0]})`); continue; }
  if (!fm || typeof fm !== 'object') { problems.push(`${f}: frontmatter is empty`); continue; }

  // --- 1. Safety ---
  const slug = f.replace(/\.md$/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) problems.push(`${f}: file name must be a lowercase-hyphen slug (it becomes the URL)`);
  if (slugs.has(slug)) problems.push(`${f}: duplicate slug`);
  slugs.add(slug);
  if ('slug' in fm) problems.push(`${f}: a "slug" key is not allowed; the file name is the URL`);
  const ex = EXECUTABLE.exec(body);
  if (ex) problems.push(`${f}: body contains executable or document-loading markup ("${ex[0].trim()}")`);
  for (const s of strings(fm)) { const e = EXECUTABLE.exec(s); if (e) { problems.push(`${f}: frontmatter contains executable markup ("${e[0].trim()}")`); break; } }
  for (const s of body.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=\s*["'][^"']+["']/i.test(s[0])) problems.push(`${f}: a body image has no alt text`);
    const srcm = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(s[0]);
    if (srcm && !/^\/images\/\d{4}\/\d{2}\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/.test(srcm[1])) problems.push(`${f}: body image src must be /images/YYYY/MM/name.jpg (got "${srcm[1]}")`);
  }
  for (const s of body.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) if (!s[1].trim()) problems.push(`${f}: a Markdown image has no alt text`);

  // --- 2. Integrity ---
  if (!fm.title || typeof fm.title !== 'string') problems.push(`${f}: no title`);
  if (fm.title && fm.title.length > 200) problems.push(`${f}: title over 200 characters`);
  if (!fm.description) problems.push(`${f}: no description`);
  if (fm.description && fm.description.length > DESCRIPTION_MAX) problems.push(`${f}: description over ${DESCRIPTION_MAX} characters (search engines cut it)`);
  if (fm.seoTitle && fm.seoTitle.length > 70) problems.push(`${f}: seoTitle over 70 characters`);
  if (!authors.has(fm.author)) problems.push(`${f}: author "${fm.author}" is not in authors.json (${[...authors].join(', ')})`);
  if (fm.category !== undefined && !CATEGORIES.includes(fm.category)) problems.push(`${f}: category "${fm.category}" is not one of ${CATEGORIES.join(', ')}`);
  const date = new Date(fm.date);
  if (isNaN(date)) problems.push(`${f}: date "${fm.date}" is not a valid date`);
  else if (date.getTime() > now + 24 * 3600 * 1000) problems.push(`${f}: date is in the future (${fm.date})`);
  if (fm.updated && new Date(fm.updated) < date) problems.push(`${f}: updated is before date`);
  if (fm.wpId && date > IMPORT_CUTOFF) problems.push(`${f}: wpId is only for stories imported from WordPress; a new story must pass the newsroom rules`);
  const imgs = [];
  if (fm.image) {
    if (!fm.image.src) problems.push(`${f}: image has no src`);
    else imgs.push(fm.image.src);
    if (!fm.image.alt || !String(fm.image.alt).trim()) problems.push(`${f}: image without alt text`);
  }
  for (const s of body.matchAll(/(?:src|href)="(\/images\/[^"]+)"/g)) imgs.push(s[1]);
  for (const s of body.matchAll(/!\[[^\]]*\]\((\/images\/[^)]+)\)/g)) imgs.push(s[1]);
  for (const i of new Set(imgs)) {
    const p = resolve('public', '.' + i.split('?')[0]);
    if (!p.startsWith(resolve('public/images') + sep)) problems.push(`${f}: image path leaves /images/: ${i}`);
    else if (!existsSync(p)) problems.push(`${f}: image file does not exist: ${i}`);
  }
  for (const s of fm.sources ?? []) {
    if (!s.url || !/^https?:\/\/[^\s"'<>]+$/.test(s.url)) problems.push(`${f}: source "${s.name}" has no http(s) url`);
    if (!s.name) problems.push(`${f}: a source has no name`);
  }
  if (fm.live && !['live', 'ended'].includes(fm.live)) problems.push(`${f}: live must be "live" or "ended"`);
  if (fm.live === 'live' && !(fm.updates ?? []).length) problems.push(`${f}: live: live but no updates`);
  for (const u of fm.updates ?? []) {
    if (isNaN(new Date(u.time))) problems.push(`${f}: an update has an invalid time`);
    if (!u.body) problems.push(`${f}: an update has no body`);
  }
  for (const e of fm.embeds ?? []) {
    if (e.type === 'youtube' && !/^[A-Za-z0-9_-]{11}$/.test(e.id ?? '')) problems.push(`${f}: a youtube embed needs an 11-character video id`);
    if (e.type === 'x' && !/^https:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/.test(e.url ?? '')) problems.push(`${f}: an x embed needs a https://x.com/<user>/status/<id> url`);
    if (!['youtube', 'x', 'quote'].includes(e.type)) problems.push(`${f}: unknown embed type "${e.type}"`);
  }

  // --- 3. Newsroom rules: new posts only ---
  if (fm.wpId) continue;
  // Tags out, then quoted speech out (a quote may legitimately say "yesterday"). Quotes do not span lines.
  const text = body.replace(/<[^>]+>/g, ' ').replace(/"[^"\n]{1,400}"|“[^”\n]{1,400}”/g, ' ');
  for (const md of text.matchAll(MONTH_DAY)) if (/^[A-Z]/.test(md[0])) { problems.push(`${f}: date without a year: "${md[0]}"`); break; }
  if (CHARGED.test(text) && !RESOLVED.test(text) && !PRESUMPTION.test(body)) problems.push(`${f}: charges reported without "The allegations have not been proven in court."`);
  const rel = RELATIVE.exec(text);
  if (rel) problems.push(`${f}: relative-time wording ("${rel[1]}")`);
  if ((fm.sources ?? []).length < 2) problems.push(`${f}: a new story needs at least two sources (two independent reports, or one primary record plus a report)`);
}

if (problems.length) {
  console.error('Content checks failed:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(`Content checks passed (${slugs.size} posts).`);
