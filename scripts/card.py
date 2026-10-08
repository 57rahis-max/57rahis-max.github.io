"""Draw a Max Crime information card: the site's own graphic for a story with
no photo it is licensed to publish. Dark panel, red rule, a kicker, a short
headline, up to four dated rows, a closing line and the sources.

    python3 scripts/card.py spec.json      # spec: a list of card objects

Each card: {"out": "public/images/YYYY/MM/name-card.jpg", "kicker": "...",
"title": "...", "rows": [["Sept. 5, 2026", "What happened."], ...],
"foot": "The allegations have not been proven in court.", "sources": "Sources: ..."}
Every fact on a card must already be in the story, with its source.
"""
import json, sys
from PIL import Image, ImageDraw, ImageFont

FONT = '/System/Library/Fonts/HelveticaNeue.ttc'
BG, RED, WHITE, GREY, MUTED = (24, 24, 28), (200, 30, 36), (255, 255, 255), (200, 200, 205), (140, 140, 148)

def font(size, bold=True):
    return ImageFont.truetype(FONT, size, index=1 if bold else 0)

def wrap(draw, text, f, width):
    lines, cur = [], ''
    for word in text.split():
        trial = (cur + ' ' + word).strip()
        if draw.textlength(trial, font=f) <= width: cur = trial
        else: lines.append(cur); cur = word
    lines.append(cur)
    return lines

def card(spec):
    W, PAD = 1200, 70
    probe = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    title_lines = wrap(probe, spec['title'], font(50), W - 2 * PAD)
    rows = [(h, wrap(probe, b, font(27, False), W - PAD - 116)) for h, b in spec['rows']]
    foot_lines = wrap(probe, spec.get('foot', ''), font(27), W - 2 * PAD) if spec.get('foot') else []
    src_lines = wrap(probe, spec['sources'], font(21, False), W - 2 * PAD)
    H = 48 + 48 + 62 * len(title_lines) + 26 + sum(44 + 34 * len(b) + 24 for _, b in rows) + 30 + 36 * len(foot_lines) + 28 * len(src_lines) + 40
    H = max(H, 675)
    img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 12), fill=RED)
    y = 48
    d.text((PAD, y), spec['kicker'].upper(), font=font(26), fill=RED); y += 48
    for ln in title_lines: d.text((PAD, y), ln, font=font(50), fill=WHITE); y += 62
    y += 26
    for head, body in rows:
        d.ellipse((PAD, y + 10, PAD + 22, y + 32), fill=RED)
        d.text((PAD + 46, y), head, font=font(32), fill=WHITE); y += 44
        for ln in body: d.text((PAD + 46, y), ln, font=font(27, False), fill=GREY); y += 34
        y += 24
    y = H - 40 - 28 * len(src_lines) - 36 * len(foot_lines) - 10
    for ln in foot_lines: d.text((PAD, y), ln, font=font(27), fill=(235, 235, 235)); y += 36
    y += 10
    for ln in src_lines: d.text((PAD, y), ln, font=font(21, False), fill=MUTED); y += 28
    img.save(spec['out'], quality=90)
    return img.size

if __name__ == '__main__':
    for spec in json.load(open(sys.argv[1])):
        print(spec['out'], card(spec))
