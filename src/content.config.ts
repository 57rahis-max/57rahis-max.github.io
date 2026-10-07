import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const image = z.object({
  src: z.string(),
  alt: z.string().min(1, 'every image needs alt text'),
  caption: z.string().optional(),
  credit: z.string().optional(),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: reference('authors'),
    category: z.string().default('Crime News'),
    tags: z.array(z.string()).default([]),
    image: image.optional(),
    sources: z.array(z.object({ name: z.string(), title: z.string().optional(), url: z.string().url(), date: z.string().optional() })).default([]),
    // A developing story: timestamped updates, newest first, shown as a live blog.
    live: z.enum(['live', 'ended']).optional(),
    updates: z.array(z.object({ time: z.coerce.date(), title: z.string().optional(), body: z.string() })).default([]),
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
