export const SITE = {
  name: 'Max Crime',
  url: 'https://maxcrime.com',
  tagline: 'Crime and court news, sourced and attributed.',
  description: 'Max Crime reports US crime, courts and investigations. Every story is attributed to at least two independent news reports or an official record.',
  logo: '/logo.png',
  locale: 'en_US',
};

export const NAV = [
  { label: 'Latest', href: '/' },
  { label: 'Crime News', href: '/category/crime-news/' },
  { label: 'Courts', href: '/category/courts/' },
  { label: 'Live', href: '/live/' },
];

import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/** The on-disk file for a site image, or undefined if the path would leave public/images. */
function imageFile(src: string): string | undefined {
  const p = resolve('public', '.' + src);
  return p.startsWith(resolve('public/images') + sep) ? p : undefined;
}

/** The 800px thumbnail made by scripts/thumbs.py, when there is one. */
export function thumb(src?: string): string | undefined {
  if (!src || !src.startsWith('/images/')) return src;
  const t = src.replace(/\.(jpe?g|png|webp)$/i, '.w800.jpg');
  const f = imageFile(t);
  return f && existsSync(f) ? t : src;
}

/** Pixel size of an image under public/, read from the file header (JPEG/PNG/WebP). */
export function imageSize(src?: string): { width: number; height: number } | undefined {
  if (!src || !src.startsWith('/images/')) return undefined;
  const p = imageFile(src);
  if (!p || !existsSync(p)) return undefined;
  const b = readFileSync(p);
  if (b[0] === 0x89 && b[1] === 0x50) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    if (b.toString('ascii', 12, 16) === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (b.toString('ascii', 12, 16) === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  return undefined;
}

/** A srcset of the thumbnail and the original, with the original's TRUE width. */
export function srcsetFor(src?: string): string | undefined {
  if (!src) return undefined;
  const t = thumb(src); const size = imageSize(src);
  if (!t || t === src || !size) return undefined;
  return size.width > 800 ? `${t} 800w, ${src} ${size.width}w` : undefined;
}

/** Reading time from rendered text, not MDX source: strips tags, components and frontmatter. */
export const readingMinutes = (text: string) => {
  const words = text.replace(/<[^>]+>/g, ' ').replace(/^---[\s\S]*?---/, '').replace(/\{[^}]*\}/g, ' ').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
  return Math.max(1, Math.round(words / 230));
};

export const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const categoryUrl = (c: string) => `/category/${slugify(c)}/`;
export const postUrl = (id: string) => `/${id}/`;
export const authorUrl = (id: string) => `/author/${id}/`;

const TZ = 'America/New_York';
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { timeZone: TZ, month: 'long', day: 'numeric', year: 'numeric' });
export const fmtDateTime = (d: Date) =>
  d.toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
/** Lists show a clock time for something from today (Eastern) and a date for anything older. */
export const fmtWhen = (d: Date) => (dayKey(d) === dayKey(new Date()) ? fmtTime(d) : fmtDate(d));

