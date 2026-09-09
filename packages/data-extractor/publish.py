"""Resize every asset icon to a 256px PNG at the game's own icon path, ready for the CDN.

`data/ui/fhd/base/icon_content/x.png` in the game data -> `<cdn_dir>/data/ui/fhd/base/icon_content/x.png`.
Usage: python3 publish.py <extracted_dir> <source.sqlite> <cdn_dir>
Then:  rclone sync <cdn_dir> <R2_REMOTE>   (see package.json "publish")
"""

import os
import re
import sqlite3
import sys
from pathlib import Path

from PIL import Image

SIZE = 256


def key(icon_path: str) -> str:
    """CDN path = the path the game references, normalised to forward slashes and .png."""
    return icon_path.replace("\\", "/").rsplit(".", 1)[0] + ".png"


def source_file(extracted: Path, icon_path: str):
    p = icon_path.replace("\\", "/")
    cand = extracted / (
        re.sub(r"^data/ui/fhd/", "data/ui/4k/", p).rsplit(".", 1)[0] + "_0.dds"
    )
    return cand if cand.exists() else None


def main(extracted, source_db, out):
    extracted, out = Path(extracted), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    icons = {
        r[0]
        for r in sqlite3.connect(source_db).execute(
            "select distinct icon from assets where icon is not null"
        )
    }
    done = skipped = missing = 0
    for icon in sorted(icons):
        src = source_file(extracted, icon)
        if src is None:
            missing += 1
            continue
        dst = out / key(icon)
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            skipped += 1
            continue
        with Image.open(src) as im:
            im = im.convert("RGBA")
            im.thumbnail((SIZE, SIZE), Image.LANCZOS, reducing_gap=2.0)
            im.save(dst, "PNG", optimize=True)
        done += 1
    total = sum(f.stat().st_size for f in out.rglob("*.png")) / 1e6
    print(
        f"resized={done} unchanged={skipped} no_source={missing} files={len(list(out.rglob('*.png')))} size={total:.1f}MB -> {out}"
    )


if __name__ == "__main__":
    main(*sys.argv[1:4])
