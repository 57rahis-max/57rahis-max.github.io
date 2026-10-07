"""One-time import of every published maxcrime.com WordPress post into the
Astro site: body HTML, featured image, author, category, dates, Yoast
description and the Sources list. Images are downloaded into public/images/
and every maxcrime.com upload URL in the body is rewritten to the local copy.
URLs keep their WordPress slug so links and rankings carry over.

Read-only against WordPress (public REST API). Run from the site root:
    python3 scripts/import-wordpress.py
"""
import html
import json
import os
import re
import urllib.request

API = "https://maxcrime.com/wp-json/wp/v2"
UA = {"User-Agent": "maxcrime-migration/1.0"}
AUTHORS = {1: "alex", 2: "henry", 3: "staff"}
OUT = "src/content/posts"
IMG_DIR = "public/images"


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def local_image(url):
    """Download a wp-content/uploads file once; return its local /images/... path."""
    m = re.search(r"/wp-content/uploads/(.+)$", url.split("?")[0])
    if not m:
        return url
    rel = m.group(1)
    dest = os.path.join(IMG_DIR, rel)
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(get(url))
    return "/images/" + rel


def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def yaml_str(s):
    return json.dumps(s, ensure_ascii=False)


posts = json.loads(get(f"{API}/posts?per_page=100&status=publish&_embed=1"))
cats = {c["id"]: c["name"] for c in json.loads(get(f"{API}/categories?per_page=100"))}
os.makedirs(OUT, exist_ok=True)

for p in posts:
    body = p["content"]["rendered"]
    # Gutenberg's block comments are editor markup, not content.
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)

    # Featured image: the post's own, with alt and caption from the media item.
    image = None
    media = (p.get("_embedded", {}).get("wp:featuredmedia") or [None])[0]
    if media and media.get("source_url"):
        cap_html = (media.get("caption") or {}).get("rendered", "")
        image = {"src": local_image(media["source_url"]), "alt": media.get("alt_text") or text(p["title"]["rendered"])}
        cap = text(cap_html)
        if cap:
            image["caption"] = cap
        # The theme shows the featured image above the story; drop the copy at
        # the top of the body so it is not shown twice. Keep its caption.
        fname = os.path.basename(media["source_url"]).rsplit(".", 1)[0]
        first = re.match(r"\s*<figure[^>]*>.*?</figure>", body, flags=re.S)
        if first and fname in first.group(0):
            fc = re.search(r"<figcaption[^>]*>(.*?)</figcaption>", first.group(0), flags=re.S)
            if fc:
                image["caption"] = text(fc.group(1))
                image["credit_html"] = fc.group(1).strip()
            body = body[first.end():]

    # Sources list at the end of the body becomes structured frontmatter.
    sources = []
    sm = re.search(r"<h2[^>]*>\s*Sources\s*</h2>\s*<ul[^>]*>(.*?)</ul>\s*$", body, flags=re.S)
    if sm:
        for li in re.findall(r"<li[^>]*>(.*?)</li>", sm.group(1), flags=re.S):
            a = re.search(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>(.*)', li, flags=re.S)
            if not a:
                continue
            label, rest = text(a.group(2)), text(a.group(3))
            name, _, title = label.partition(": ")
            src = {"name": name, "url": a.group(1)}
            if title:
                src["title"] = title
            d = re.search(r"\((.*?)\)", rest)
            if d:
                src["date"] = d.group(1)
            sources.append(src)
        body = body[: sm.start()]

    # Every remaining maxcrime upload in the body is served locally.
    body = re.sub(r'https://maxcrime\.com/wp-content/uploads/[^"\s)]+', lambda m: local_image(m.group(0)), body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()

    title = text(p["title"]["rendered"])
    yoast = (p.get("yoast_head_json") or {}).get("description")
    desc = (yoast or text(p["excerpt"]["rendered"]) or title)[:170]
    cat = cats.get((p.get("categories") or [0])[0], "Crime News")
    if cat == "Uncategorized":
        cat = "Crime News"

    fm = [
        "---",
        f"title: {yaml_str(title)}",
        f"description: {yaml_str(desc)}",
        f"date: {p['date_gmt']}Z",
    ]
    if p.get("modified_gmt") and p["modified_gmt"] != p["date_gmt"]:
        fm.append(f"updated: {p['modified_gmt']}Z")
    fm += [f"author: {AUTHORS.get(p['author'], 'staff')}", f"category: {yaml_str(cat)}"]
    if image:
        fm.append("image:")
        fm.append(f"  src: {yaml_str(image['src'])}")
        fm.append(f"  alt: {yaml_str(image['alt'])}")
        if image.get("credit_html"):
            # The figure caption, links and license included, rendered as HTML.
            fm.append(f"  credit: {yaml_str(image['credit_html'])}")
        elif image.get("caption"):
            fm.append(f"  caption: {yaml_str(image['caption'])}")
    if sources:
        fm.append("sources:")
        for s in sources:
            fm.append(f"  - name: {yaml_str(s['name'])}")
            fm.append(f"    url: {yaml_str(s['url'])}")
            if s.get("title"):
                fm.append(f"    title: {yaml_str(s['title'])}")
            if s.get("date"):
                fm.append(f"    date: {yaml_str(s['date'])}")
    fm.append(f"wpId: {p['id']}")
    fm.append("---")
    with open(os.path.join(OUT, f"{p['slug']}.md"), "w") as f:
        f.write("\n".join(fm) + "\n\n" + body + "\n")
    print(f"{p['slug']}  author={AUTHORS.get(p['author'], 'staff')}  image={'yes' if image else 'no'}  sources={len(sources)}")

print(f"\n{len(posts)} posts imported")
