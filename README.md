# Max Crime

A fast, static crime-news site built with [Astro](https://astro.build). No database and no WordPress: every story is a Markdown file, and every push to `main` builds and deploys the site to GitHub Pages.

## Features

- **News design**: masthead, sticky section nav, lead story, latest grid, live strip, light and dark mode, and a mobile layout. Headlines use Source Serif 4 and the interface uses Inter.
- **Article pages**: breadcrumbs, dek, byline with avatar, published and updated times, reading time, credited hero image, sources list, share links, author box and related stories (internal links).
- **Live blogs**: give a story `live: live` and timestamped `updates`. They render as a timeline, newest first, and readers see a "new updates" prompt without reloading. Set `live: ended` when coverage stops.
- **Structured data**:
  - `NewsArticle` on every story, and `LiveBlogPosting` with `liveBlogUpdate` on live stories.
  - `BreadcrumbList`, `ProfilePage`/`Person` on author pages, and `WebSite` + `NewsMediaOrganization` with publishing, corrections and ethics policies.
- **SEO**: canonical URLs, Open Graph and Twitter cards, `sitemap-index.xml`, `rss.xml` and `robots.txt`.
- **Embeds as data**: a story lists its `embeds` in the frontmatter (a YouTube video, an X post, a pull quote), and the page renders them with the matching component. The YouTube player loads only on click, from youtube-nocookie; an X post is readable without JavaScript.
- **Bodies are sanitized**: story HTML is reduced to a fixed allowlist of tags and attributes at build time (`astro.config.mjs`). Scripts, iframes, inline event handlers and `javascript:` links never reach a reader, whatever a story file contains.
- **Newsroom checks in CI**: `npm run check` blocks a deploy if a story has an image without alt text, a date without a year, relative wording such as "currently" or "latest", or charges reported without "The allegations have not been proven in court."

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## Write a story

Create `src/content/posts/<slug>.md` (top level, lowercase letters, digits and hyphens). The file name is the URL, `maxcrime.com/<slug>/`, and nothing in the frontmatter can change it.

```md
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
embeds:                 # optional
  - type: youtube
    id: dQw4w9WgXcQ
    title: "What the video shows"
  - type: x
    url: "https://x.com/user/status/123"
    author: "Name (@user)"
    text: "The post's text, word for word"
    date: "October 7, 2026"
  - type: quote
    text: "A quotation, word for word from the source."
    cite: "Who said it"
    source: "Outlet that reported it"
---

Story text…
```

Put images in `public/images/<year>/<month>/`.

## Authors

Edit `src/content/authors/authors.json`. Each author has a name, a role, a bio, initials and a color, which are used for the avatar, the author box and the author page at `/author/<id>/`.

## Deploy and domain

1. Push to GitHub. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. To serve the site on maxcrime.com:
   - In the DNS (Cloudflare for maxcrime.com), remove the old `A`, `AAAA` and `CNAME` records for `@` and `www`, then add these, all set to **DNS only** (grey cloud) so GitHub can issue the HTTPS certificate:
     - `A` `@` to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`
     - `AAAA` `@` to `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` and `2606:50c0:8003::153`
     - `CNAME` `www` to `57rahis-max.github.io`
   - Leave `MX` and `TXT` records alone; they carry email and verification.
   - Set the custom domain in the repository's **Settings → Pages → Custom domain** (or `gh api -X PUT repos/57rahis-max/57rahis-max.github.io/pages -f cname=maxcrime.com`). A `CNAME` file is not used: GitHub ignores it when the site deploys from Actions.
   - When the certificate is issued, turn on **Enforce HTTPS** on the same page.
   - Optional but recommended: verify the domain under your GitHub account's **Settings → Pages**, so no one else can claim it.

## Migration

`scripts/import-wordpress.py` imported every published WordPress post, including its images, author, category, dates, Yoast description and sources, and kept every URL the same.
