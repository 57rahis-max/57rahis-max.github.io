// Pre-publish checks that run in CI before every deploy. A failure blocks the
// deploy, so a story that breaks a newsroom rule never goes live.
import { readdirSync, readFileSync } from 'node:fs';

const dir = 'src/content/posts';
const problems = [];
const MONTH_DAY = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})\b(?!,? \d{4})(?!\d)/;
const CHARGED = /\b(?:charged with|faces? (?:\w+ ){0,3}charges?|facing (?:\w+ ){0,3}charges?|was charged|been charged|accused of|indicted)\b/i;
const RESOLVED = /not been proven|presumed innocent|\b(?:convicted|pleaded guilty|found guilty|sentenced|acquitted)\b/i;

for (const f of readdirSync(dir).filter((f) => /\.mdx?$/.test(f))) {
  const src = readFileSync(`${dir}/${f}`, 'utf8');
  const [, fm = '', body = ''] = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  if (/^wpId:/m.test(fm)) continue; // imported from WordPress; reviewed under the old process
  const text = body.replace(/<[^>]+>/g, ' ').replace(/"[^"]*"|“[^”]*”/g, ' ');
  if (!/^description: /m.test(fm)) problems.push(`${f}: no description`);
  if (/^image:/m.test(fm) && !/^\s+alt: .+/m.test(fm)) problems.push(`${f}: image without alt text`);
  const m = MONTH_DAY.exec(text);
  if (m && /^[A-Z]/.test(m[0])) problems.push(`${f}: date without a year: "${m[0]}"`);
  if (CHARGED.test(text) && !RESOLVED.test(body)) problems.push(`${f}: charges reported without "The allegations have not been proven in court."`);
  if (/\b(latest|so far|to date|currently|right now)\b/i.test(text)) problems.push(`${f}: relative-time wording ("latest", "so far", "currently")`);
}
if (problems.length) {
  console.error('Content checks failed:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log('Content checks passed.');
