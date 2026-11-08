"""Anno 117 RDA (Resource File V2.2) reader + layered extractor. Stdlib only.

The game loads every maindata/*.rda in alphabetical order; later archives
override earlier paths (patches ship as zz_patchfiles*.rda). `Layered` merges
them the same way so `extract` always yields the current state of each file.

Usage:
  python3 rda.py list     <maindata_dir|file.rda> [--filter REGEX]
  python3 rda.py manifest <maindata_dir> [--filter REGEX]      # path -> providing rda (json)
  python3 rda.py extract  <maindata_dir|file.rda> <out_dir> [--filter REGEX]

Layout (matches RDAExplorer): 784-byte header, uint64 first block offset.
Block = [memres data][directory][memres hdr 16B][block hdr 32B] -> next block.
"""

import json
import re
import struct
import sys
import zlib
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

MAGIC = b"Resource File V2.2"
HEADER_SIZE = 784
BLOCK_HDR = struct.Struct(
    "<IIQQQ"
)  # flags, fileCount, dirSize, dirDecompressedSize, nextBlock
FILE_HDR = struct.Struct(
    "<520sQQQQQ"
)  # utf16 path, offset, compressed, size, timestamp, unknown
MEMRES_HDR = struct.Struct("<QQ")  # compressed, uncompressed
F_COMPRESSED, F_ENCRYPTED, F_MEMRESIDENT, F_DELETED = 1, 2, 4, 8
SEED = 0x71C71C71

# Include all UI images: backgrounds and rarity textures need not start with icon_.
# Also include icon textures outside data/ui (unit banners, map markers, app icons).
DEFAULT_FILTER = (
    r"^data/(base/)?config/.*\.xml$|"
    r"^data/(?:ui/.*|.*icon.*)\.(?:dds|png|tga|jpg|jpeg|bmp|webp)$"
)


def crypt(buf: bytes) -> bytes:
    """XOR with MSVC LCG keystream; symmetric. Trailing odd byte untouched."""
    out = bytearray(buf)
    key = SEED
    for i in range(0, len(out) - 1, 2):
        key = (key * 214013 + 2531011) & 0xFFFFFFFF
        k = (key >> 16) & 0x7FFF
        out[i] ^= k & 0xFF
        out[i + 1] ^= k >> 8
    return bytes(out)


def decode(buf: bytes, flags: int, size: int) -> bytes:
    if flags & F_ENCRYPTED:
        buf = crypt(buf)
    if flags & F_COMPRESSED:
        buf = zlib.decompress(buf)
    return buf[:size]


@dataclass
class Entry:
    name: str
    offset: int
    compressed: int
    size: int
    flags: int
    blob: bytes | None  # decoded memory-resident block, if any
    rda: "Rda"

    def read(self) -> bytes:
        if self.blob is not None:
            return self.blob[self.offset : self.offset + self.size]
        return decode(
            self.rda._read_at(self.offset, self.compressed), self.flags, self.size
        )


class Rda:
    def __init__(self, path):
        self.path = Path(path)
        self.f = open(path, "rb")
        if self.f.read(len(MAGIC)) != MAGIC:
            self.f.close()
            raise ValueError(f"{path}: not an RDA v2.2 file")
        (first,) = struct.unpack("<Q", self._read_at(HEADER_SIZE, 8))
        self.entries: list[Entry] = list(self._walk(first))

    def _read_at(self, off, n):
        self.f.seek(off)
        return self.f.read(n)

    def close(self):
        if not self.f.closed:
            self.f.close()

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc, _tb):
        self.close()

    def _walk(self, off):
        size = self.path.stat().st_size
        while 0 < off < size:
            flags, count, dir_size, dir_dec, nxt = BLOCK_HDR.unpack(
                self._read_at(off, BLOCK_HDR.size)
            )
            if count and not flags & F_DELETED:
                memres = bool(flags & F_MEMRESIDENT)
                dir_off = off - dir_size - (MEMRES_HDR.size if memres else 0)
                directory = decode(
                    self._read_at(dir_off, dir_size), flags, count * FILE_HDR.size
                )
                blob = None
                if memres:
                    comp, uncomp = MEMRES_HDR.unpack(
                        self._read_at(off - MEMRES_HDR.size, MEMRES_HDR.size)
                    )
                    blob = decode(self._read_at(dir_off - comp, comp), flags, uncomp)
                for i in range(count):
                    raw, o, c, s, _ts, _u = FILE_HDR.unpack_from(
                        directory, i * FILE_HDR.size
                    )
                    name = raw.decode("utf-16-le").split("\0", 1)[0].replace("\\", "/")
                    yield Entry(name, o, c, s, flags, blob, self)
            if nxt == off:
                break
            off = nxt


class Layered:
    """All RDAs in a folder, alphabetical = load order, last writer wins."""

    def __init__(self, folder):
        folder = Path(folder)
        paths = (
            [folder]
            if folder.is_file()
            else sorted(folder.glob("*.rda"), key=lambda p: p.name.lower())
        )
        if not paths:
            raise FileNotFoundError(f"no .rda files found in {folder}")
        self.rdas: list[Rda] = []
        self.files: dict[str, Entry] = {}
        try:
            for p in paths:
                archive = Rda(p)
                self.rdas.append(archive)
                for e in archive.entries:
                    self.files[e.name] = e
        except Exception:
            self.close()
            raise

    def select(self, pattern: str):
        rx = re.compile(pattern, re.I)
        return sorted((k, e) for k, e in self.files.items() if rx.search(k))

    def close(self):
        for archive in self.rdas:
            archive.close()

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc, _tb):
        self.close()


def extraction_target(out: Path, name: str) -> Path:
    """Return a safe destination for an archive member."""
    rel = PurePosixPath(name)
    if rel.is_absolute() or any(part in ("", ".", "..") for part in rel.parts):
        raise ValueError(f"unsafe archive path: {name!r}")
    root = out.resolve()
    dst = root.joinpath(*rel.parts).resolve()
    if dst != root and root not in dst.parents:
        raise ValueError(f"archive path escapes output directory: {name!r}")
    return dst


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    cmd, src = argv[1], argv[2]
    flt = argv[argv.index("--filter") + 1] if "--filter" in argv else DEFAULT_FILTER
    with Layered(src) as layered:
        picked = layered.select(flt)
        if cmd == "list":
            for name, e in picked:
                print(f"{e.size:>12}  {e.rda.path.name:<28} {name}")
        elif cmd == "manifest":
            print(json.dumps({name: e.rda.path.name for name, e in picked}, indent=1))
        elif cmd == "extract":
            if len(argv) < 4:
                sys.exit(__doc__)
            out = Path(argv[3])
            for name, e in picked:
                dst = extraction_target(out, name)
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst.write_bytes(e.read())
            (out / "manifest.json").write_text(
                json.dumps({n: e.rda.path.name for n, e in picked}, indent=1),
                encoding="utf-8",
            )
            print(f"{len(picked)} files -> {out}")
        else:
            sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
