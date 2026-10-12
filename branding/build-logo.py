"""Build the parker567 wordmark and square mark as pure-path SVGs (no font needed to render).

  python3 branding/build-logo.py <path to Poppins-ExtraBold.ttf>

Poppins (SIL Open Font License 1.1) ExtraBold outlines are converted to SVG paths with fontTools,
so the files render the same everywhere. PNGs are then made with `node branding/render-png.mjs`.
"""
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

INK = '#F5F7FA'      # light wordmark ink, for the dark UI
ACCENT = '#24EE89'   # the one accent (the UI's brand green)
TILE = '#1A1D1E'     # the square mark's tile

here = Path(__file__).resolve().parent
font = TTFont(sys.argv[1])
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font['head'].unitsPerEm
hmtx = font['hmtx']
cap = font['OS/2'].sCapHeight or 700


def run(text, size, x0, baseline, tracking=0.0):
    """One path string for `text` at `size` px, left at x0, on `baseline`. Returns (d, advance)."""
    scale = size / upm
    pen = SVGPathPen(glyphs, ntos=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
    x = x0
    for ch in text:
        name = cmap[ord(ch)]
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        x += hmtx[name][0] * scale + tracking * size
    return pen.getCommands(), x - x0 - tracking * size


def bounds(text, size, tracking=0.0):
    """Ink box of `text` (left bearing of the first glyph to the right edge of the last)."""
    from fontTools.pens.boundsPen import BoundsPen
    scale = size / upm
    x, lo, hi = 0.0, None, None
    for ch in text:
        name = cmap[ord(ch)]
        bp = BoundsPen(glyphs)
        glyphs[name].draw(bp)
        if bp.bounds:
            a, _, b, _ = bp.bounds
            lo = x + a * scale if lo is None else lo
            hi = x + b * scale
        x += hmtx[name][0] * scale + tracking * size
    return lo, hi


# Wordmark: 288x64 (the 4.5:1 box the bc.game wordmark fills, so it drops into every slot).
W, H = 288, 64
TRACK = 0.01
size = 10.0
# Largest size whose ink fits 280 wide and whose caps are <= 40 tall.
while True:
    lo, hi = bounds('PARKER567', size + 0.25, TRACK)
    if hi - lo > W - 8 or (size + 0.25) * cap / upm > 40:
        break
    size += 0.25
lo, hi = bounds('PARKER567', size, TRACK)
x0 = (W - (hi - lo)) / 2 - lo
baseline = H / 2 + (size * cap / upm) / 2
d1, adv = run('PARKER', size, x0, baseline, TRACK)
d2, _ = run('567', size, x0 + adv + TRACK * size, baseline, TRACK)
wordmark = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="PARKER567">
<title>PARKER567</title>
<path fill="{INK}" d="{d1}"/>
<path fill="{ACCENT}" d="{d2}"/>
</svg>
'''
(here / 'parker567-logo.svg').write_text(wordmark)

# Square mark: "P5" in the accent on a dark rounded tile (reads on dark and light tabs alike).
S = 128
size = 10.0
while True:
    lo, hi = bounds('P5', size + 0.25)
    if hi - lo > S - 36 or (size + 0.25) * cap / upm > 62:
        break
    size += 0.25
lo, hi = bounds('P5', size)
x0 = (S - (hi - lo)) / 2 - lo
baseline = S / 2 + (size * cap / upm) / 2
dm, _ = run('P5', size, x0, baseline)
mark = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}" role="img" aria-label="P5">
<title>PARKER567</title>
<rect width="{S}" height="{S}" rx="28" fill="{TILE}"/>
<path fill="{ACCENT}" d="{dm}"/>
</svg>
'''
(here / 'parker567-mark.svg').write_text(mark)
print('wrote', here / 'parker567-logo.svg', here / 'parker567-mark.svg')
