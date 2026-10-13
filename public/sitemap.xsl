<?xml version="1.0" encoding="UTF-8"?>
<!-- How a sitemap looks when a person opens it in a browser. Search engines
     read the XML and ignore this. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>Sitemap · Max Crime</title>
        <style>
          body { font: 15px/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 24px 16px; }
          main { max-width: 1000px; margin: 0 auto; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          p { color: #555; margin: 0 0 18px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
          th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #555; border-bottom: 2px solid #111; }
          td.d { white-space: nowrap; color: #555; width: 1%; }
          a { color: #b00; word-break: break-all; }
          @media (prefers-color-scheme: dark) { body { background: #111; color: #eee; } p, th, td.d { color: #aaa; } th { border-color: #eee; } td { border-color: #333; } a { color: #f66; } }
        </style>
      </head>
      <body><main>
        <xsl:choose>
          <xsl:when test="s:sitemapindex">
            <h1>Max Crime sitemap index</h1>
            <p><xsl:value-of select="count(s:sitemapindex/s:sitemap)"/> sitemaps</p>
            <table><tr><th>Sitemap</th><th>Last changed</th></tr>
              <xsl:for-each select="s:sitemapindex/s:sitemap">
                <tr><td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td><td class="d"><xsl:value-of select="translate(substring(s:lastmod, 1, 16), 'T', ' ')"/></td></tr>
              </xsl:for-each>
            </table>
          </xsl:when>
          <xsl:otherwise>
            <h1>Max Crime sitemap</h1>
            <p><xsl:value-of select="count(s:urlset/s:url)"/> URLs · <a href="/sitemap-index.xml">all sitemaps</a></p>
            <table><tr><th>URL</th><th>Images</th><th>Last changed (UTC)</th></tr>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a><xsl:if test="news:news"><br/><small><xsl:value-of select="news:news/news:title"/></small></xsl:if></td>
                  <td class="d"><xsl:value-of select="count(image:image)"/></td>
                  <td class="d"><xsl:value-of select="translate(substring(concat(s:lastmod, news:news/news:publication_date), 1, 16), 'T', ' ')"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:otherwise>
        </xsl:choose>
      </main></body>
    </html>
  </xsl:template>
</xsl:stylesheet>
