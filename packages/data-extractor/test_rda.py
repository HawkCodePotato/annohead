"""Self-check: build synthetic v2.2 archives (plain, compressed+encrypted memres) and read them back."""
import struct
import sys
import tempfile
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import rda  # noqa: E402


def file_hdr(name, off, comp, size):
    return rda.FILE_HDR.pack(name.encode("utf-16-le"), off, comp, size, 0, 0)


def build(blocks):
    """blocks: list of (flags, {name: bytes}). Returns archive bytes."""
    out = bytearray(rda.MAGIC.ljust(rda.HEADER_SIZE, b"\0") + b"\0" * 8)
    prev_hdr_pos = rda.HEADER_SIZE  # where to patch the "next" pointer
    for flags, files in blocks:
        enc = lambda b: zlib.compress(b) if flags & rda.F_COMPRESSED else b  # noqa: E731
        enc2 = lambda b: rda.crypt(enc(b)) if flags & rda.F_ENCRYPTED else enc(b)  # noqa: E731
        directory = b""
        if flags & rda.F_MEMRESIDENT:
            blob, off = b"", 0
            for n, d in files.items():
                directory += file_hdr(n, off, len(d), len(d))
                blob += d
                off += len(d)
            data = enc2(blob)
            out += data
            d = enc2(directory)
            out += d
            out += rda.MEMRES_HDR.pack(len(data), len(blob))
        else:
            for n, d in files.items():
                e = enc2(d)
                directory += file_hdr(n, len(out), len(e), len(d))
                out += e
            d = enc2(directory)
            out += d
        hdr_pos = len(out)
        struct.pack_into("<Q", out, prev_hdr_pos, hdr_pos)
        out += rda.BLOCK_HDR.pack(flags, len(files), len(d), len(directory), 0)
        prev_hdr_pos = hdr_pos + 24  # offset of nextBlock field within this header
    return bytes(out)


with tempfile.TemporaryDirectory() as tmp:
    d = Path(tmp)
    (d / "config.rda").write_bytes(build([
        (0, {"data/base/config/export/assets.xml": b"<base/>", "data/ui/x/icon_content/a.dds": b"DDS"}),
        (rda.F_COMPRESSED | rda.F_ENCRYPTED | rda.F_MEMRESIDENT, {"data/base/config/gui/texts_english.xml": b"<t>hi</t>"}),
    ]))
    (d / "zz_patchfiles_01.rda").write_bytes(build([
        (rda.F_COMPRESSED | rda.F_ENCRYPTED, {"data/base/config/export/assets.xml": b"<patched/>"}),
    ]))
    with rda.Layered(d) as layered:
        assert layered.files["data/base/config/export/assets.xml"].read() == b"<patched/>"
        assert layered.files["data/base/config/export/assets.xml"].rda.path.name == "zz_patchfiles_01.rda"
        assert layered.files["data/base/config/gui/texts_english.xml"].read() == b"<t>hi</t>"
        assert [n for n, _ in layered.select(rda.DEFAULT_FILTER)] == sorted(layered.files)
        assert rda.crypt(rda.crypt(b"roundtrip!")) == b"roundtrip!"
    assert all(archive.f.closed for archive in layered.rdas)
    try:
        rda.extraction_target(d, "../outside.txt")
    except ValueError:
        pass
    else:
        raise AssertionError("archive path traversal was not rejected")
print("ok")
