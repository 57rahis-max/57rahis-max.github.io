import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'hast-util-sanitize';

// Story bodies are written by an automated pipeline that quotes outside
// sources, so a body is treated as untrusted input. Raw HTML in a story is
// parsed into real nodes first (rehype-raw) and then cut down to this
// allowlist (rehype-sanitize) before anything is rendered. A <script>,
// an inline event handler or a javascript: link cannot reach a reader.
// (2026-10-08: a <script> in a Markdown body shipped verbatim before this.)
const schema = {
  ...defaultSchema,
  tagNames: ['p', 'a', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'figure', 'figcaption', 'img', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'cite', 'aside', 'code', 'pre', 'sup', 'sub'],
  attributes: {
    a: ['href', ['target', '_blank'], ['rel', 'noopener', 'noreferrer', 'nofollow']],
    // An image may only be a file this site ships. (An empty protocol list in
    // hast-util-sanitize means "no restriction", so the path itself is matched.)
    img: [['src', /^\/images\/\d{4}\/\d{2}\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/], 'alt', 'width', 'height', ['loading', 'lazy', 'eager'], ['decoding', 'async']],
    aside: [['className', 'callout', 'correction'], ['role', 'note']],
    p: [['className', 'callout-title', 'callout-note']],
    td: ['colSpan', 'rowSpan'],
    th: ['colSpan', 'rowSpan', ['scope', 'col', 'row']],
    '*': [],
  },
  // A link is absolute http(s) or a relative path; nothing else.
  protocols: { href: ['http', 'https'] },
  strip: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'template', 'noscript'],
  clobber: ['id', 'name'],
};

// Article URLs stay at the root (maxcrime.com/<slug>/), exactly as they were
// on WordPress, so existing links and search rankings carry over.
export default defineConfig({
  site: 'https://maxcrime.com',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !/\/(search|404)\/$/.test(page) })],
  markdown: {
    processor: unified({ rehypePlugins: [rehypeRaw, [rehypeSanitize, schema]] }),
  },
});
