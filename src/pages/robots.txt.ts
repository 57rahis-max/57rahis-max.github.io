export function GET() {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: https://maxcrime.com/sitemap-index.xml\n`, { headers: { 'Content-Type': 'text/plain' } });
}
