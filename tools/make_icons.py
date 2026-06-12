#!/usr/bin/env python3
"""Genereert de PWA-iconen voor Stilte (enso-ring op nachtgradient).

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
BG_CENTER = (38, 30, 84)      # diep violet
BG_EDGE = (11, 16, 38)        # nachtblauw
RING = (236, 197, 130)        # warm goud
GLOW = (200, 170, 255)        # zachte lila gloed


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


def render(size, ring_scale=1.0):
    """Rendert het icoon op `size` met 2x supersampling.

    ring_scale < 1 verkleint de ring (veilige zone voor maskable icons).
    """
    ss = 2
    big = size * ss
    cx = cy = big / 2.0
    half = big / 2.0

    ring_r = half * 0.56 * ring_scale
    ring_t = half * 0.085 * ring_scale
    # Opening van de enso rechtsboven, met taps toelopende uiteinden
    gap_center = math.radians(-55)
    gap_half = math.radians(26)
    taper = math.radians(16)

    rng = random.Random(7)
    stars = []
    for _ in range(14):
        a = rng.uniform(0, 2 * math.pi)
        d = rng.uniform(0.62, 0.95) * half
        stars.append((cx + d * math.cos(a), cy + d * math.sin(a),
                      rng.uniform(1.2, 2.6) * ss, rng.uniform(0.25, 0.7)))

    buf = bytearray(big * big * 4)
    for y in range(big):
        dy = y - cy
        row = y * big * 4
        for x in range(big):
            dx = x - cx
            d = math.sqrt(dx * dx + dy * dy)

            # Achtergrond: radiale gradient
            t = min(1.0, d / half)
            t = t * t * 0.85 + t * 0.15
            r = BG_CENTER[0] + (BG_EDGE[0] - BG_CENTER[0]) * t
            g = BG_CENTER[1] + (BG_EDGE[1] - BG_CENTER[1]) * t
            b = BG_CENTER[2] + (BG_EDGE[2] - BG_CENTER[2]) * t

            # Zachte lila gloed binnen de ring
            glow = 0.16 * math.exp(-(d / (ring_r * 0.9)) ** 2 * 1.8)
            r += (GLOW[0] - r) * glow
            g += (GLOW[1] - g) * glow
            b += (GLOW[2] - b) * glow

            # Sterren
            for sx, sy, sr, sb in stars:
                sd2 = (x - sx) ** 2 + (y - sy) ** 2
                if sd2 < (sr * 4) ** 2:
                    s = sb * math.exp(-sd2 / (sr * sr))
                    r += (255 - r) * s
                    g += (255 - g) * s
                    b += (250 - b) * s

            # Enso-ring met opening
            ang = math.atan2(dy, dx)
            da = math.atan2(math.sin(ang - gap_center), math.cos(ang - gap_center))
            edge = smoothstep(gap_half, gap_half + taper, abs(da))
            band = 1.0 - smoothstep(ring_t * 0.5, ring_t * 0.5 + 1.6 * ss,
                                    abs(d - ring_r))
            a = band * edge
            if a > 0:
                # Lichte gloed rond de ring zelf
                halo = 0.35 * math.exp(-((d - ring_r) / (ring_t * 2.2)) ** 2) * edge
                a = min(1.0, a + 0)
                r += (RING[0] - r) * max(a, 0) + (RING[0] - r) * halo * 0.3
                g += (RING[1] - g) * max(a, 0) + (RING[1] - g) * halo * 0.3
                b += (RING[2] - b) * max(a, 0) + (RING[2] - b) * halo * 0.3
            else:
                halo = 0.30 * math.exp(-((d - ring_r) / (ring_t * 2.6)) ** 2) * edge
                if halo > 0.004:
                    r += (RING[0] - r) * halo
                    g += (RING[1] - g) * halo
                    b += (RING[2] - b) * halo

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
        ("apple-touch-icon.png", 180, 0.9),
    ]
    for name, size, scale in jobs:
        path = os.path.join(OUT_DIR, name)
        write_png(path, size, size, render(size, scale))
        print("geschreven:", os.path.relpath(path))


if __name__ == "__main__":
    main()
