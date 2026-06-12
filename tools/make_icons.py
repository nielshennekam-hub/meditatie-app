#!/usr/bin/env python3
"""Genereert de PWA-iconen voor Stilte.

Compositie: penseelachtige enso-ring met goud-naar-lila verloop op een
diepe nachthemel, een fonkelende ster in de opening van de ring.
Gebruikt alleen de Python-standaardbibliotheek; uitvoer in ./icons/.
Draaien vanuit de repo-root: python3 tools/make_icons.py
"""
import math
import os
import random
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")

# Kleuren (RGB 0-255)
BG_CENTER = (42, 32, 88)       # diep violet
BG_EDGE = (9, 13, 34)          # nachtblauw
RING_GOLD = (240, 200, 128)    # warm goud
RING_LILAC = (186, 152, 255)   # zacht lila
GLOW = (196, 168, 255)         # gloed binnen de ring
SPARK = (255, 244, 214)        # ster in de opening


def write_png(path, w, h, pixels):
    def chunk(typ, data):
        out = struct.pack(">I", len(data)) + typ + data
        out += struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        return out

    stride = w * 4
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter: none
        raw += pixels[y * stride:(y + 1) * stride]
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def angdiff(a, b):
    return math.atan2(math.sin(a - b), math.cos(a - b))


def render(size, ring_scale=1.0):
    """Rendert het icoon op `size` met 2x supersampling.

    ring_scale < 1 verkleint de compositie (veilige zone voor maskable icons).
    """
    ss = 2
    big = size * ss
    cx = cy = big / 2.0
    half = big / 2.0

    ring_r = half * 0.56 * ring_scale
    t_base = half * 0.072 * ring_scale
    gap_center = math.radians(-55)   # opening rechtsboven
    gap_half = math.radians(24)
    taper = math.radians(15)
    opp = gap_center + math.pi       # dikste punt tegenover de opening

    # Ster in de opening van de enso
    spark_x = cx + ring_r * math.cos(gap_center)
    spark_y = cy + ring_r * math.sin(gap_center)
    spark_s = half * 0.040 * ring_scale

    # Aurora-tinten voor diepte in de achtergrond
    blobs = [
        (big * 0.20, big * 0.18, half * 0.55, (148, 118, 226), 0.13),
        (big * 0.82, big * 0.86, half * 0.60, (74, 132, 176), 0.10),
    ]

    rng = random.Random(11)
    stars = []
    for _ in range(18):
        a = rng.uniform(0, 2 * math.pi)
        d = rng.uniform(0.58, 0.96) * half
        stars.append((cx + d * math.cos(a), cy + d * math.sin(a),
                      rng.uniform(1.1, 2.8) * ss, rng.uniform(0.22, 0.65)))

    buf = bytearray(big * big * 4)
    for y in range(big):
        dy = y - cy
        row = y * big * 4
        for x in range(big):
            dx = x - cx
            d = math.sqrt(dx * dx + dy * dy)

            # Achtergrond: radiale gradient met lichte vignet
            t = min(1.0, d / half)
            t = t * t * 0.8 + t * 0.2
            r = BG_CENTER[0] + (BG_EDGE[0] - BG_CENTER[0]) * t
            g = BG_CENTER[1] + (BG_EDGE[1] - BG_CENTER[1]) * t
            b = BG_CENTER[2] + (BG_EDGE[2] - BG_CENTER[2]) * t

            # Aurora-blobs
            for bx, by, bs, bc, bw in blobs:
                w = bw * math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (2 * bs * bs))
                r += (bc[0] - r) * w
                g += (bc[1] - g) * w
                b += (bc[2] - b) * w

            # Zachte gloed binnen de ring
            glow = 0.15 * math.exp(-(d / (ring_r * 0.9)) ** 2 * 1.8)
            r += (GLOW[0] - r) * glow
            g += (GLOW[1] - g) * glow
            b += (GLOW[2] - b) * glow

            # Sterren
            for sx, sy, sr, sb in stars:
                sd2 = (x - sx) ** 2 + (y - sy) ** 2
                if sd2 < (sr * 4) ** 2:
                    s = sb * math.exp(-sd2 / (sr * sr))
                    r += (255 - r) * s
                    g += (252 - g) * s
                    b += (244 - b) * s

            # Enso-ring: penseeldikte + kleurverloop goud -> lila
            ang = math.atan2(dy, dx)
            da = abs(angdiff(ang, gap_center))
            edge = smoothstep(gap_half, gap_half + taper, da)
            if edge > 0.001:
                brush = 0.66 + 0.46 * (0.5 + 0.5 * math.cos(angdiff(ang, opp)))
                tt = t_base * brush
                band = 1.0 - smoothstep(tt * 0.5, tt * 0.5 + 1.7 * ss,
                                        abs(d - ring_r))
                mix = clamp01((dx + dy) / (2.4 * ring_r) + 0.5)
                rc = RING_GOLD[0] + (RING_LILAC[0] - RING_GOLD[0]) * mix
                gc = RING_GOLD[1] + (RING_LILAC[1] - RING_GOLD[1]) * mix
                bc = RING_GOLD[2] + (RING_LILAC[2] - RING_GOLD[2]) * mix
                halo = 0.30 * math.exp(-((d - ring_r) / (tt * 2.4)) ** 2) * edge
                a = clamp01(band * edge + halo * 0.4)
                r += (rc - r) * a
                g += (gc - g) * a
                b += (bc - b) * a

            # Vierpuntige ster in de opening
            sdx = x - spark_x
            sdy = y - spark_y
            if abs(sdx) < spark_s * 6 and abs(sdy) < spark_s * 6:
                core = math.exp(-(sdx * sdx + sdy * sdy) / (2 * spark_s * spark_s))
                arm_h = math.exp(-(sdy / (spark_s * 0.35)) ** 2) * \
                    math.exp(-abs(sdx) / (spark_s * 2.6))
                arm_v = math.exp(-(sdx / (spark_s * 0.35)) ** 2) * \
                    math.exp(-abs(sdy) / (spark_s * 2.6))
                s = clamp01(core + 0.75 * (arm_h + arm_v)) * 0.95
                r += (SPARK[0] - r) * s
                g += (SPARK[1] - g) * s
                b += (SPARK[2] - b) * s

            buf[row + x * 4] = max(0, min(255, int(r + 0.5)))
            buf[row + x * 4 + 1] = max(0, min(255, int(g + 0.5)))
            buf[row + x * 4 + 2] = max(0, min(255, int(b + 0.5)))
            buf[row + x * 4 + 3] = 255

    # Downsample 2x2 (box)
    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            for c in range(4):
                s = (buf[((y * 2) * big + x * 2) * 4 + c]
                     + buf[((y * 2) * big + x * 2 + 1) * 4 + c]
                     + buf[((y * 2 + 1) * big + x * 2) * 4 + c]
                     + buf[((y * 2 + 1) * big + x * 2 + 1) * 4 + c])
                out[(y * size + x) * 4 + c] = s // 4
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [
        ("icon-512.png", 512, 1.0),
        ("icon-192.png", 192, 1.0),
        ("icon-maskable-512.png", 512, 0.72),
        ("icon-maskable-192.png", 192, 0.72),
        # Aparte bestandsnamen per maat: omzeilt ook de hardnekkige
        # apple-touch-icon-cache van iOS na een eerdere mislukte fetch.
        ("apple-touch-icon-180.png", 180, 0.94),
        ("apple-touch-icon-167.png", 167, 0.94),
        ("apple-touch-icon-152.png", 152, 0.94),
        ("apple-touch-icon-120.png", 120, 0.94),
    ]
    for name, size, scale in jobs:
        path = os.path.join(OUT_DIR, name)
        write_png(path, size, size, render(size, scale))
        print("geschreven:", os.path.relpath(path))


if __name__ == "__main__":
    main()
