"""
scripts/generate-og-image.py
Generates public/og-image.png (1200×630) mimicking the ProbHammer
simulator dashboard aesthetic — histogram, stats, dark theme.
"""

from PIL import Image, ImageDraw, ImageFont
import math

# ── Colors (from theme.js) ─────────────────────────────────────────────────
BG        = (10,  22,  33)   # #0A1621
SURFACE   = (15,  34,  48)   # #0F2230
SURFACE_E = (20,  50,  71)   # #143247
BORDER    = (30,  58,  76)   # #1E3A4C
TEXT      = (230, 241, 255)  # #E6F1FF
TEXT_SEC  = (157, 183, 198)  # #9DB7C6
TEXT_WEAK = (95,  124, 138)  # #5F7C8A
TEXT_OFF  = (62,  90,  104)  # #3E5A68
ACCENT    = (47,  224, 255)  # #2FE0FF
HIGHLIGHT = (194, 143, 133)  # #C28F85

W, H = 1200, 630

img  = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(img)

# ── Fonts ─────────────────────────────────────────────────────────────────
def font(size, bold=False):
    paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono%s.ttf' % ('-Bold' if bold else ''),
        '/usr/share/fonts/truetype/liberation/LiberationMono%s.ttf' % ('-Bold' if bold else '-Regular'),
    ]
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except: pass
    return ImageFont.load_default()

f_huge   = font(88,  bold=True)
f_big    = font(52,  bold=True)
f_mid    = font(22,  bold=True)
f_label  = font(15)
f_small  = font(13)
f_tiny   = font(11)

# ── Helpers ────────────────────────────────────────────────────────────────
def rect(x, y, w, h, color, alpha=255):
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rectangle([x, y, x+w, y+h], fill=(*color, alpha))
    img.paste(Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB'))

def text(s, x, y, color, f, anchor='lt'):
    draw.text((x, y), s, fill=color, font=f, anchor=anchor)

def line(x1, y1, x2, y2, color, width=1):
    draw.line([(x1, y1), (x2, y2)], fill=color, width=width)

# ── Background panels ──────────────────────────────────────────────────────
# Left panel (stats)
rect(48, 48, 340, 534, SURFACE)
draw.rectangle([48, 48, 388, 582], outline=BORDER, width=1)

# Right panel (histogram)
rect(424, 48, 728, 534, SURFACE)
draw.rectangle([424, 48, 1152, 582], outline=BORDER, width=1)

# ── Left panel: branding + stats ──────────────────────────────────────────

# Badge line
text('PROB\'HAMMER', 72, 76, ACCENT, f_mid)

# Separator line
line(72, 110, 366, 110, BORDER, 1)

# Context label
text('INTERCESSORS  ·  BOLT RIFLE  ·  VS  CHAOS SPACE MARINES', 72, 122, TEXT_OFF, f_tiny)

# Mean damage — big warm number
text('4.87', 72, 148, HIGHLIGHT, f_huge)

# Mean label
line(72, 262, 264, 262, BORDER, 1)
text('MEAN DAMAGE', 72, 270, TEXT_WEAK, f_small)

# Kill chance
text('73%', 72, 302, ACCENT, f_big)
text('KILL CHANCE', 72, 362, TEXT_WEAK, f_small)

# Separator
line(72, 388, 366, 388, BORDER, 1)

# Stats rows
stats = [
    ('MEDIAN',   '5'),
    ('STD DEV',  '1.42'),
    ('P10',      '2'),
    ('P90',      '7'),
    ('MIN—MAX',  '0 — 9'),
]
y = 402
for label, val in stats:
    text(label, 72,  y, TEXT_WEAK, f_small)
    text(val,   366, y, TEXT_SEC,  f_small, anchor='rt')
    y += 28
    line(72, y-2, 366, y-2, BORDER, 1)

# ── Right panel: histogram ────────────────────────────────────────────────
# Simulated realistic damage distribution for Bolt Rifle vs CSM
# Roughly a bell-ish curve centered around 4-5

raw_dist = {
    0: 0.008,
    1: 0.024,
    2: 0.068,
    3: 0.112,
    4: 0.178,
    5: 0.208,   # peak
    6: 0.172,
    7: 0.119,
    8: 0.071,
    9: 0.040,
}

chart_x  = 452
chart_y  = 96
chart_w  = 672
chart_h  = 400

# Section label
text('DAMAGE DISTRIBUTION', chart_x, 68, TEXT_WEAK, f_small)

max_prob  = max(raw_dist.values())
n_bars    = len(raw_dist)
bar_gap   = 10
bar_w     = (chart_w - bar_gap * (n_bars - 1)) // n_bars

# Subtle horizontal grid lines
grid_vals = [0.05, 0.10, 0.15, 0.20]
for gv in grid_vals:
    gy = chart_y + chart_h - int(chart_h * gv / max_prob)
    line(chart_x, gy, chart_x + chart_w, gy, BORDER, 1)
    text('%d%%' % int(gv * 100), chart_x - 6, gy, TEXT_OFF, f_tiny, anchor='rm')

for i, (dmg, prob) in enumerate(sorted(raw_dist.items())):
    bx    = chart_x + i * (bar_w + bar_gap)
    bh    = int(chart_h * prob / max_prob)
    by    = chart_y + chart_h - bh

    is_peak = prob == max_prob
    color   = HIGHLIGHT if is_peak else ACCENT
    alpha   = 230 if is_peak else 115

    rect(bx, by, bar_w, bh, color, alpha)

    # X axis label
    text(str(dmg), bx + bar_w // 2, chart_y + chart_h + 10, TEXT_WEAK, f_tiny, anchor='mt')

# X axis baseline
line(chart_x, chart_y + chart_h, chart_x + chart_w, chart_y + chart_h, BORDER, 1)

# ── Decorative scan line at top ───────────────────────────────────────────
for i in range(0, W, 4):
    line(i, 0, i, 2, (*ACCENT, 0), 1)

# Thin accent top border
line(0, 0, W, 0, ACCENT, 2)

# ── Bottom bar ─────────────────────────────────────────────────────────────
rect(0, 600, W, 30, SURFACE_E)
line(0, 600, W, 600, BORDER, 1)
text('WH40K 10E  ·  MONTE CARLO ENGINE  ·  1000 TRIALS  ·  FREE', 48, 609, TEXT_OFF, f_tiny)
text('40K.PROBHAMMER.COM', W - 48, 609, TEXT_WEAK, f_tiny, anchor='rt')

# ── Save ─────────────────────────────────────────────────────────────────
out = 'frontend/public/og-image.png'
img.save(out, 'PNG', optimize=True)
print(f'Saved {W}×{H} → {out}')
