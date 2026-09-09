"""Convert extracted .dds icons to .png (Pillow). Mirrors the data/ui tree.

Usage: python3 icons.py <extracted_dir> <out_dir>
"""

import collections
import struct
import sys
from pathlib import Path

from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
stats = collections.Counter()
failed = collections.defaultdict(list)
for dds in src.rglob("*.dds"):
    dst = (out / dds.relative_to(src)).with_suffix(".png")
    if dst.exists() and dst.stat().st_mtime >= dds.stat().st_mtime:
        stats["skipped"] += 1
        continue
    try:
        with Image.open(dds) as im:
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.save(dst)
        stats["ok"] += 1
    except Exception as ex:
        # DX10 header: dxgiFormat is uint32 at byte 128
        with open(dds, "rb") as f:
            hdr = f.read(148)
        fmt = (
            struct.unpack_from("<I", hdr, 128)[0]
            if hdr[84:88] == b"DX10"
            else hdr[84:88]
        )
        failed[f"{fmt}: {type(ex).__name__}: {ex}"].append(str(dds.relative_to(src)))
        stats["failed"] += 1
print(dict(stats))
for k, v in failed.items():
    print(f"  {len(v):>5}  {k}  e.g. {v[0]}")
