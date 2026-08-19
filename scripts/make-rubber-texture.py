"""
Draw the studded rubber floor texture (docs/specs/visual-configuration design
decision 5): public/render/floor-rubber.webp.

The floor is a regular grid of raised discs, so it is exactly describable and
tiles seamlessly — which is why it is drawn rather than photographed. No CC0
library has a studded rubber floor, and the granulated gym mats they do have
are the one pattern that would not tell this floor apart from PVC.

Run from the repo root (needs cwebp on PATH):

    python3 scripts/make-rubber-texture.py
"""

import math
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

N = 512        # texture size, px
PITCH = 64     # stud spacing, px — 8 studs per tile edge, ~40 mm at the scale
               # the viewer tiles it (0.32 m per tile)
R = 20.0       # stud radius, px
SS = 3         # supersamples per axis

BASE = (34, 35, 37)
STUD = (58, 60, 63)

OUT = Path("public/render/floor-rubber.webp")


def tile() -> bytes:
    rows = []
    for y in range(N):
        row = bytearray()
        for x in range(N):
            cov = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    px, py = x + (sx + 0.5) / SS, y + (sy + 0.5) / SS
                    d = math.hypot((px % PITCH) - PITCH / 2, (py % PITCH) - PITCH / 2)
                    # a soft shoulder, so a stud reads as a raised disc rather
                    # than a decal
                    cov += 1.0 if d < R - 2 else (0.0 if d > R else (R - d) / 2)
            cov /= SS * SS
            for i in range(3):
                v = BASE[i] + (STUD[i] - BASE[i]) * cov
                row.append(max(0, min(255, int(v + 0.5))))
        rows.append(bytes(row))

    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))


def main() -> None:
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(tile())
        png = f.name
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cwebp", "-q", "92", "-quiet", png, "-o", str(OUT)], check=True)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    sys.exit(main())
