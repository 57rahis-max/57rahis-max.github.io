import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Article URLs stay at the root (maxcrime.com/<slug>/), exactly as they were
// on WordPress, so existing links and search rankings carry over.
export default defineConfig({
  site: 'https://maxcrime.com',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
  markdown: { smartypants: true },
});
