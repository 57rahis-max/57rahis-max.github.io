import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const IMAGE_PATH = /^\/images\/\d{4}\/\d{2}\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/;

const image = z.object({
  src: z.string().regex(IMAGE_PATH, 'image src must be /images/YYYY/MM/name.jpg'),
  alt: z.string().min(1, 'every image needs alt text').max(200),
  caption: z.string().max(300).optional(),
  credit: z.string().max(400).optional(),
});

const posts = defineCollection({
  // Top-level .md files only. The id is the file name: a frontmatter `slug`
  // key could otherwise silently replace another story at its URL, and a
  // nested file escaped the CI checks (2026-10-08).
  loader: glob({
    pattern: '*.md',
    base: './src/content/posts',
    generateId: ({ entry }) => {
      const id = entry.replace(/\.md$/, '');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Post file name "${entry}" must be a lowercase-hyphen slug; it becomes the URL.`);
      return id;
    },
  }),
  schema: z.object({
    title: z.string().max(200),
    /** Short headline for the <title> tag and social cards; the full title stays on the page. */
    seoTitle: z.string().max(70).optional(),
    description: z.string().max(170),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: reference('authors'),
    category: z.enum(['Crime News', 'Courts', 'News']).default('Crime News'),
    tags: z.array(z.string().max(40)).max(12).default([]),
    image: image.optional(),
    sources: z.array(z.object({ name: z.string().max(80), title: z.string().max(200).optional(), url: z.string().regex(/^https?:\/\/[^\s"'<>]+$/, 'source url must be http(s)'), date: z.string().max(40).optional() })).default([]),
    /** Embeds are data, not code: the page renders them with the matching component. */
    embeds: z.array(z.discriminatedUnion('type', [
      z.object({ type: z.literal('youtube'), id: z.string().regex(/^[A-Za-z0-9_-]{11}$/), title: z.string().max(200), caption: z.string().max(300).optional() }),
      z.object({ type: z.literal('x'), url: z.string().regex(/^https:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/), author: z.string().max(80), text: z.string().max(600), date: z.string().max(40) }),
      z.object({ type: z.literal('quote'), text: z.string().max(600), cite: z.string().max(120), source: z.string().max(120).optional() }),
    ])).default([]),
    // A developing story: timestamped updates, newest first, shown as a live blog.
    live: z.enum(['live', 'ended']).optional(),
    updates: z.array(z.object({ time: z.coerce.date(), title: z.string().max(200).optional(), body: z.string().max(4000) })).default([]),
    draft: z.boolean().default(false),
    wpId: z.number().optional(),
  }),
});

const authors = defineCollection({
  loader: file('./src/content/authors/authors.json'),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    bio: z.string(),
    initials: z.string().max(3),
    color: z.string().default('#B3121F'),
  }),
});

export const collections = { posts, authors };
