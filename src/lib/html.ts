/**
 * Two small guards for text that leaves the templating engine's protection.
 *
 * Astro escapes `{expr}` in text and attributes, so most of the site is safe
 * by default. Two places deliberately emit raw markup, and a hostile-input
 * audit (2026-10-08) showed a story title containing `</script>` would close
 * the JSON-LD script tag early and run as JavaScript. These keep those two
 * paths honest.
 */

/** JSON for inline <script type="application/ld+json">: cannot close the tag or break the parser. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Image credits carry a link and a license name, nothing else. Allow only
 * <a href="http(s)…">, <em>, <strong>, <i>, <b>; drop every other tag, every
 * attribute except a safe href, and escape stray text.
 */
export function sanitizeCredit(html: string): string { return sanitize(html, ['em', 'strong', 'i', 'b']); }

/** Live-update bodies: short paragraphs with links. */
export function sanitizeUpdate(html: string): string { return sanitize(html, ['p', 'em', 'strong', 'i', 'b', 'br', 'ul', 'ol', 'li', 'blockquote']); }

function sanitize(html: string, allowed: string[]): string {
  const esc = (s: string) => s.replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = '';
  const re = /<\/?([a-zA-Z]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  const open: string[] = [];
  while ((m = re.exec(html))) {
    if (m[3] !== undefined) { out += esc(m[3]); continue; }
    const tag = m[1].toLowerCase(); const closing = m[0].startsWith('</');
    if (tag === 'a') {
      if (closing) { if (open.pop() === 'a') out += '</a>'; continue; }
      const href = /href\s*=\s*["']([^"']+)["']/i.exec(m[2])?.[1] ?? '';
      if (!/^https?:\/\//i.test(href)) { continue; }
      open.push('a'); out += `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener">`;
    } else if (allowed.includes(tag)) {
      if (tag === 'br') { out += '<br>'; continue; }
      if (closing) { if (open.pop() === tag) out += `</${tag}>`; } else { open.push(tag); out += `<${tag}>`; }
    }
    // any other tag is dropped
  }
  while (open.length) out += `</${open.pop()}>`;
  return out;
}
