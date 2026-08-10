"""Extrae el logo de CamiHogar del JPEG a PNGs con canal alfa limpio.

El JPEG es de 2 tintas sobre fondo #25160F: naranja #E8511A (casa + regla) y
blanco (wordmark). Para cada pixel resolvemos P = bg + a*(ink - bg), eligiendo
la tinta cuyo residuo sea menor. Eso elimina el fondo y los artefactos JPEG
manteniendo el antialiasing original.
"""

from PIL import Image

SRC = "public/camihogarlogo.jpeg"
BG = (0x25, 0x16, 0x0F)
ORANGE = (0xE8, 0x51, 0x1A)
WHITE = (0xFF, 0xFF, 0xFF)

img = Image.open(SRC).convert("RGB")
W, H = img.size
px = list(img.getdata())

DO = tuple(ORANGE[i] - BG[i] for i in range(3))
DW = tuple(WHITE[i] - BG[i] for i in range(3))
NO = sum(c * c for c in DO)
NW = sum(c * c for c in DW)


def unmix(d, dv, nv):
    a = (d[0] * dv[0] + d[1] * dv[1] + d[2] * dv[2]) / nv
    a = 0.0 if a < 0 else (1.0 if a > 1 else a)
    resid = sum((d[i] - a * dv[i]) ** 2 for i in range(3))
    return a, resid


out = []
for r, g, b in px:
    d = (r - BG[0], g - BG[1], b - BG[2])
    ao, ro = unmix(d, DO, NO)
    aw, rw = unmix(d, DW, NW)
    if ro <= rw:
        a, ink = ao, ORANGE
    else:
        a, ink = aw, WHITE
    # Limpia el ruido de compresión del fondo plano.
    a = 0.0 if a < 0.06 else (a - 0.06) / 0.94
    out.append((ink[0], ink[1], ink[2], int(a * 255 + 0.5)))

full = Image.new("RGBA", (W, H))
full.putdata(out)

alpha = full.getchannel("A")
ap = list(alpha.getdata())

# --- Bandas de filas con tinta ---
rows_with_ink = [
    y for y in range(H) if sum(1 for x in range(W) if ap[y * W + x] > 38) > 2
]
bands = []
start = prev = rows_with_ink[0]
for y in rows_with_ink[1:]:
    if y - prev > 12:
        bands.append((start, prev))
        start = y
    prev = y
bands.append((start, prev))
print("bandas (y0,y1):", bands)


def crop_band(y0, y1, pad=6):
    cols = [
        x
        for x in range(W)
        if any(ap[y * W + x] > 38 for y in range(y0, y1 + 1))
    ]
    x0, x1 = cols[0], cols[-1]
    return full.crop(
        (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + 1 + pad), min(H, y1 + 1 + pad))
    )


# bandas: 0=techo, 1=monograma CH, 2=wordmark CAMIHOGAR, 3=regla naranja
mark = crop_band(bands[0][0], bands[1][1])      # casa completa (techo + CH)
word = crop_band(bands[2][0], bands[2][1])      # CAMIHOGAR
lockup = crop_band(bands[0][0], bands[-1][1], pad=10)

mark.save("public/logo-mark.png")
word.save("public/logo-wordmark.png")
lockup.save("public/logo-lockup.png")
print("mark", mark.size, "word", word.size, "lockup", lockup.size)


def recolor(im, ink):
    """Versión monocroma: conserva el alfa, pinta todo de un color."""
    a = im.getchannel("A")
    solid = Image.new("RGBA", im.size, ink + (255,))
    solid.putalpha(a)
    return solid


recolor(lockup, WHITE).save("public/logo-lockup-white.png")
recolor(mark, WHITE).save("public/logo-mark-white.png")
recolor(lockup, BG).save("public/logo-lockup-dark.png")

# Lockup para fondo claro: casa naranja + wordmark en marrón oscuro.
light = lockup.copy()
data = []
for r, g, b, a in light.getdata():
    if r > 200 and g > 200:  # tinta blanca -> marrón
        data.append((BG[0], BG[1], BG[2], a))
    else:
        data.append((r, g, b, a))
light.putdata(data)
light.save("public/logo-lockup-light.png")

# --- Iconos de app: marca naranja centrada sobre cuadrado marrón ---
for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-icon.png")]:
    canvas = Image.new("RGBA", (size, size), BG + (255,))
    m = mark.copy()
    m.thumbnail((int(size * 0.68), int(size * 0.68)), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    canvas.save(f"public/{name}")

ico = Image.new("RGBA", (256, 256), BG + (255,))
m = mark.copy()
m.thumbnail((180, 180), Image.LANCZOS)
ico.alpha_composite(m, ((256 - m.width) // 2, (256 - m.height) // 2))
ico.save(
    "app/favicon.ico",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print("iconos listos")
