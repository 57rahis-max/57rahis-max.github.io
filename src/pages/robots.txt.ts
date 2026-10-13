export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://maxcrime.com/sitemap-index.xml',
    'Sitemap: https://maxcrime.com/news-sitemap.xml',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
