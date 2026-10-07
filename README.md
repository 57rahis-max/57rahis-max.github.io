# Max Crime

A fast, static crime-news site built with [Astro](https://astro.build). No database and no WordPress: every story is a Markdown or MDX file, and every push to `main` builds and deploys the site to GitHub Pages.

## Features

- **News design**: masthead, sticky section nav, lead story, latest grid, live strip, light and dark mode, and a mobile layout. Headlines use Source Serif 4 and the interface uses Inter.
- **Article pages**: breadcrumbs, dek, byline with avatar, published and updated times, reading time, credited hero image, sources list, share links, author box and related stories (internal links).
- **Live blogs**: give a story `live: live` and timestamped `updates`. They render as a timeline, newest first, and readers see a "new updates" prompt without reloading. Set `live: ended` when coverage stops.
- **Structured data**:
  - `NewsArticle` on every story, and `LiveBlogPosting` with `liveBlogUpdate` on live stories.
  - `BreadcrumbList`, `ProfilePage`/`Person` on author pages, and `WebSite` + `NewsMediaOrganization` with publishing, corrections and ethics policies.
- **SEO**: canonical URLs, Open Graph and Twitter cards, `sitemap-index.xml`, `rss.xml` and `robots.txt`.
- **Embeds in MDX**:
  - `<YouTube id="…" title="…" caption="…" />` loads the player only on click, from youtube-nocookie.
  - `<Tweet url="…" author="…" text="…" date="…" />` is readable without JavaScript.
  - `<PullQuote cite="…" source="…">…</PullQuote>`
- **Newsroom checks in CI**: `npm run check` blocks a deploy if a story has an image without alt text, a date without a year, relative wording such as "currently" or "latest", or charges reported without "The allegations have not been proven in court."

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## Write a story

Create `src/content/posts/<slug>.mdx`. The slug becomes the URL: `maxcrime.com/<slug>/`.

```mdx
---
title: "Headline"
description: "One or two sentences, at most 170 characters."
date: 2026-10-07T20:00:00Z
author: alex            # an id from src/content/authors/authors.json
category: "Crime News"
tags: ["courts"]
image:
  src: /images/2026/10/photo.jpg
  alt: "What the image shows"
  credit: 'Photo: Name / <a href="…">Wikimedia Commons</a>, CC BY 4.0.'
sources:
  - name: "AP"
    title: "Article title"
    url: "https://…"
    date: "Oct. 7, 2026"
---

Story text…
```

Put images in `public/images/<year>/<month>/`.

## Authors

Edit `src/content/authors/authors.json`. Each author has a name, a role, a bio, initials and a color, which are used for the avatar, the author box and the author page at `/author/<id>/`.

## Deploy and domain

1. Push to GitHub. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. To serve the site on maxcrime.com, add a `public/CNAME` file containing `maxcrime.com`, and point the domain's DNS at GitHub Pages. That means `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, and a `CNAME` record from `www` to `<user>.github.io`.

## Migration

`scripts/import-wordpress.py` imported every published WordPress post, including its images, author, category, dates, Yoast description and sources, and kept every URL the same.
