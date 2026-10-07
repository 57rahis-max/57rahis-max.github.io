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

import { existsSync } from 'node:fs';

/** The 800px thumbnail made by scripts/thumbs.py, when there is one. */
export function thumb(src?: string): string | undefined {
  if (!src || !src.startsWith('/images/')) return src;
  const t = src.replace(/\.(jpe?g|png|webp)$/i, '.w800.jpg');
  return existsSync(`public${t}`) ? t : src;
}

export const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const categoryUrl = (c: string) => `/category/${slugify(c)}/`;
export const postUrl = (id: string) => `/${id}/`;
export const authorUrl = (id: string) => `/author/${id}/`;

const TZ = 'America/New_York';
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { timeZone: TZ, month: 'long', day: 'numeric', year: 'numeric' });
export const fmtDateTime = (d: Date) =>
  d.toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

export const readingMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 230));
