"""Make an 800px-wide thumbnail (name.w800.jpg) for every image in
public/images, and cap originals at 1600px wide. Idempotent: run it after
adding images; the build uses a thumbnail when one exists."""
import os
from PIL import Image, ImageOps
made = shrunk = 0
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
        if not os.path.exists(t):
            w = min(800, im.width)
            im.convert('RGB').resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(t, quality=78, optimize=True, progressive=True)
            made += 1
print(f'thumbnails made: {made}, originals shrunk: {shrunk}')
