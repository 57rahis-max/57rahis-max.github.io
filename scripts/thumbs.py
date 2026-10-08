"""Cap every image in public/images at 1600px wide, and make an 800px-wide
thumbnail (name.w800.jpg) for each FEATURED image — the ones cards and the
hero srcset request. Inline body images never get a thumbnail requested, so
building one for them only shipped dead weight (14 orphans, 2026-10-08).
Idempotent: run it after adding images."""
import os, re, glob
from PIL import Image, ImageOps
made = shrunk = removed = 0
featured = set()
for post in glob.glob('src/content/posts/*.md*'):
    fm = open(post).read().split('\n---\n', 1)[0]
    m = re.search(r'^  src: "?(/images/[^"\n]+)"?', fm, re.M)
    if m: featured.add('public' + m.group(1).strip())
for root, _, files in os.walk('public/images'):
    for f in files:
        if '.w800.' in f or not f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        p = os.path.join(root, f)
        try:
            im = ImageOps.exif_transpose(Image.open(p))
        except Exception:
            continue
        if im.width > 1600:
            im2 = im.convert('RGB') if p.lower().endswith(('.jpg', '.jpeg')) else im
            im2.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS).save(p, quality=84, optimize=True)
            im = Image.open(p); shrunk += 1
        t = os.path.splitext(p)[0] + '.w800.jpg'
        if p not in featured:
            if os.path.exists(t): os.remove(t); removed += 1
            continue
        if not os.path.exists(t):
            w = min(800, im.width)
            im.convert('RGB').resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(t, quality=78, optimize=True, progressive=True)
            made += 1
print(f'thumbnails made: {made}, orphan thumbnails removed: {removed}, originals shrunk: {shrunk}')
