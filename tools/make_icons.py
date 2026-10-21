"""アプリアイコン (PNG) を標準ライブラリだけで生成する。  python tools/make_icons.py"""
import os
import struct
import zlib

BG1 = (79, 70, 229)    # 左上
BG2 = (129, 140, 248)  # 右下
FG = (255, 255, 255)
LID = (224, 231, 255)


def bg(u, v):
    t = (u + v) / 2
    return tuple(round(a + (b - a) * t) for a, b in zip(BG1, BG2))


def pixel(x, y, s):
    # 角丸の背景
    r = s * 0.22
    cx = min(max(x, r), s - r)
    cy = min(max(y, r), s - r)
    if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
        return (0, 0, 0, 0)
    u, v = x / s, y / s
    BG = bg(u, v)
    # 箱のふた
    if 0.22 <= u <= 0.78 and 0.30 <= v <= 0.42:
        return LID + (255,)
    # 箱の本体と取っ手
    if 0.26 <= u <= 0.74 and 0.44 <= v <= 0.76:
        if 0.42 <= u <= 0.58 and 0.52 <= v <= 0.57:
            return BG + (255,)
        return FG + (255,)
    return BG + (255,)


def png(s, path):
    rows = b"".join(
        b"\x00" + b"".join(bytes(pixel(x + 0.5, y + 0.5, s)) for x in range(s))
        for y in range(s)
    )

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    data = (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", s, s, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows, 9))
            + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(data)


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "icons")
    for size in (180, 192, 512):
        png(size, os.path.join(out, f"icon-{size}.png"))
