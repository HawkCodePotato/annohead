#!/usr/bin/env python3
"""Cross-platform, local-only build pipeline for the Anno 117 database.

Examples:
  python pipeline.py refresh --maindata "D:/Games/Anno 117 - Pax Romana/maindata"
  python pipeline.py refresh --icons
  python pipeline.py validate

The maindata path can also be stored in annohead.local.json or supplied through
ANNO117_MAINDATA. Generated data stays under data/ and is never uploaded.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
EXTRACTED = DATA / "extracted"
SOURCE_DB = DATA / "source.sqlite"
SITE_DB = DATA / "anno.sqlite"
CDN = DATA / "cdn"
LOCAL_CONFIG = ROOT / "annohead.local.json"
CONFIG_FILTER = r"^data/(base/)?config/.*\.xml$"

EXTRACTOR = ROOT / "packages" / "data-extractor"
TRANSFORMER = ROOT / "packages" / "data-transformer"


def run(*args: object) -> None:
    command = [sys.executable, *(str(arg) for arg in args)]
    print("+", " ".join(f'"{part}"' if " " in part else part for part in command))
    subprocess.run(command, cwd=ROOT, check=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def move_generated_path(source: Path, target: Path) -> None:
    """Rename a generated path, tolerating short-lived Windows scanner locks."""
    last_error: PermissionError | None = None
    for delay in (0.0, 0.1, 0.25, 0.5, 1.0):
        if delay:
            time.sleep(delay)
        try:
            os.replace(source, target)
            return
        except PermissionError as exc:
            last_error = exc
    # shutil.move can fall back to copy/delete when Windows refuses a directory rename.
    try:
        shutil.move(str(source), str(target))
    except OSError:
        if last_error is not None:
            raise last_error
        raise


def local_config() -> dict[str, object]:
    if not LOCAL_CONFIG.exists():
        return {}
    try:
        value = json.loads(LOCAL_CONFIG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read {LOCAL_CONFIG}: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(f"{LOCAL_CONFIG} must contain a JSON object")
    return value


def steam_library_roots() -> list[Path]:
    roots: list[Path] = []
    if sys.platform == "win32":
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam") as key:
                roots.append(Path(winreg.QueryValueEx(key, "SteamPath")[0]))
        except (ImportError, OSError):
            pass
    else:
        roots.extend(
            [
                Path.home() / ".steam/steam",
                Path.home() / ".local/share/Steam",
                Path.home() / "Library/Application Support/Steam",
            ]
        )
    for root in list(roots):
        library_file = root / "steamapps/libraryfolders.vdf"
        if not library_file.exists():
            continue
        try:
            text = library_file.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for match in re.finditer(r'"path"\s+"([^"]+)"', text):
            roots.append(Path(match.group(1).replace("\\\\", "\\")))
    unique: list[Path] = []
    seen: set[str] = set()
    for root in roots:
        key = str(root).casefold()
        if key not in seen:
            seen.add(key)
            unique.append(root)
    return unique


def detect_maindata() -> Path | None:
    for library in steam_library_roots():
        candidate = library / "steamapps/common/Anno 117 - Pax Romana/maindata"
        if candidate.is_dir() and any(candidate.glob("*.rda")):
            return candidate.resolve()
    return None


def extraction_info(maindata: Path, include_icons: bool) -> dict[str, object]:
    archives = sorted(
        (
            {
                "name": path.name,
                "size": path.stat().st_size,
                "modifiedUtc": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
            }
            for path in maindata.glob("*.rda")
        ),
        key=lambda value: str(value["name"]).casefold(),
    )
    fingerprint = hashlib.sha256(
        json.dumps(archives, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    game: dict[str, object] = {"steamAppId": 3274580}
    try:
        app_manifest = maindata.parents[2] / "appmanifest_3274580.acf"
    except IndexError:
        app_manifest = Path()
    if app_manifest.is_file():
        text = app_manifest.read_text(encoding="utf-8", errors="replace")
        for source_key, target_key in (("buildid", "buildId"), ("LastUpdated", "lastUpdated")):
            match = re.search(rf'"{source_key}"\s+"([^"]+)"', text, re.I)
            if match:
                game[target_key] = match.group(1)
    return {
        "extractedAtUtc": datetime.now(timezone.utc).isoformat(),
        "includedIcons": include_icons,
        "game": game,
        "archiveFingerprint": fingerprint,
        "archives": archives,
    }


def resolve_maindata(argument: str | None) -> Path:
    configured = local_config().get("maindata")
    raw = argument or os.environ.get("ANNO117_MAINDATA") or configured
    if not raw:
        detected = detect_maindata()
        if detected is not None:
            print(f"Detected Anno 117 maindata: {detected}")
            return detected
    if not isinstance(raw, str) or not raw.strip():
        raise RuntimeError(
            "Anno 117 maindata was not detected or configured. Pass --maindata, set "
            "ANNO117_MAINDATA, or create annohead.local.json with "
            '{"maindata": "D:/.../Anno 117 - Pax Romana/maindata"}.'
        )
    path = Path(raw).expanduser().resolve()
    if not path.is_dir() or not any(path.glob("*.rda")):
        raise RuntimeError(f"No .rda archives found in {path}")
    return path


def replace_generated_directory(staging: Path, target: Path) -> None:
    """Swap a generated directory while retaining the old one until the new one is ready."""
    backup = target.with_name(f".{target.name}.backup-{os.getpid()}")
    if backup.exists():
        shutil.rmtree(backup)
    try:
        if target.exists():
            move_generated_path(target, backup)
        move_generated_path(staging, target)
    except Exception:
        if not target.exists() and backup.exists():
            move_generated_path(backup, target)
        raise
    finally:
        if staging.exists():
            shutil.rmtree(staging)
    if backup.exists():
        shutil.rmtree(backup)


def extract(maindata: Path, include_icons: bool) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    staging = DATA / f".extracted-{os.getpid()}.tmp"
    if staging.exists():
        shutil.rmtree(staging)
    args: list[object] = [EXTRACTOR / "rda.py", "extract", maindata, staging]
    if not include_icons:
        args.extend(["--filter", CONFIG_FILTER])
    try:
        run(*args)
        required = (
            staging / "data/base/config/export/assets.xml",
            staging / "data/base/config/export/templates.xml",
            staging / "data/base/config/export/properties.xml",
            staging / "data/base/config/gui/texts_english.xml",
            staging / "manifest.json",
        )
        missing = [str(path.relative_to(staging)) for path in required if not path.exists()]
        if missing:
            raise RuntimeError(f"Extraction is missing required files: {', '.join(missing)}")
        replace_generated_directory(staging, EXTRACTED)
        (DATA / "extraction-info.json").write_text(
            json.dumps(extraction_info(maindata, include_icons), indent=2) + "\n", encoding="utf-8"
        )
    except Exception:
        if staging.exists():
            shutil.rmtree(staging)
        raise


def atomic_source_db() -> None:
    staging = DATA / f".source-{os.getpid()}.sqlite"
    staging.unlink(missing_ok=True)
    try:
        run(TRANSFORMER / "assets.py", EXTRACTED, staging)
        validate_sqlite(staging, required_tables=("assets", "refs", "texts"))
        move_generated_path(staging, SOURCE_DB)
    except Exception:
        staging.unlink(missing_ok=True)
        raise


def build_icons() -> None:
    if not any(EXTRACTED.rglob("*.dds")):
        raise RuntimeError("No extracted DDS files found. Run extract/refresh with --icons first.")
    staging = DATA / f".cdn-{os.getpid()}.tmp"
    if staging.exists():
        shutil.rmtree(staging)
    try:
        run(EXTRACTOR / "publish.py", EXTRACTED, SOURCE_DB, staging)
        if not any(staging.rglob("*.png")):
            raise RuntimeError("Icon conversion produced no PNG files")
        replace_generated_directory(staging, CDN)
    except Exception:
        if staging.exists():
            shutil.rmtree(staging)
        raise


def validate_sqlite(path: Path, required_tables: tuple[str, ...] = ()) -> None:
    if not path.exists():
        raise RuntimeError(f"Database does not exist: {path}")
    with closing(sqlite3.connect(path)) as db:
        integrity = db.execute("pragma integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"{path.name}: integrity check failed: {integrity}")
        violations = db.execute("pragma foreign_key_check").fetchall()
        if violations:
            raise RuntimeError(f"{path.name}: {len(violations)} foreign-key violation(s)")
        tables = {row[0] for row in db.execute("select name from sqlite_master where type='table'")}
        missing = sorted(set(required_tables) - tables)
        if missing:
            raise RuntimeError(f"{path.name}: missing tables: {', '.join(missing)}")


def validate(run_regressions: bool = True) -> None:
    validate_sqlite(
        SITE_DB,
        required_tables=("building", "factory", "product", "residence_need", "item", "effect", "text"),
    )
    if run_regressions:
        run(TRANSFORMER / "check_site.py", SITE_DB)
    with closing(sqlite3.connect(SITE_DB)) as db:
        counts = {
            table: db.execute(f"select count(*) from {table}").fetchone()[0]
            for table in ("building", "factory", "product", "residence_need", "item", "effect")
        }
    print("validated:", " ".join(f"{key}={value}" for key, value in counts.items()))


def write_build_manifest(languages: str, include_icons: bool) -> None:
    extraction_manifest = EXTRACTED / "manifest.json"
    providers: list[str] = []
    if extraction_manifest.exists():
        manifest = json.loads(extraction_manifest.read_text(encoding="utf-8"))
        if isinstance(manifest, dict):
            providers = sorted({str(value) for value in manifest.values()})
    extraction_metadata: dict[str, object] = {}
    extraction_info_path = DATA / "extraction-info.json"
    if extraction_info_path.exists():
        value = json.loads(extraction_info_path.read_text(encoding="utf-8"))
        if isinstance(value, dict):
            extraction_metadata = value
    payload = {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "languages": [lang for lang in languages.split(",") if lang],
        "iconsBuilt": include_icons,
        "sourceArchives": providers,
        "extractionManifestSha256": sha256(extraction_manifest) if extraction_manifest.exists() else None,
        "sourceDatabaseSha256": sha256(SOURCE_DB),
        "siteDatabaseSha256": sha256(SITE_DB),
        "game": extraction_metadata.get("game"),
        "archiveFingerprint": extraction_metadata.get("archiveFingerprint"),
    }
    (DATA / "build-manifest.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def build(languages: str, include_icons: bool) -> None:
    required = EXTRACTED / "data/base/config/export/assets.xml"
    if not required.exists():
        raise RuntimeError("No extracted game data found. Run the extract or refresh command first.")
    atomic_source_db()
    if include_icons:
        build_icons()
    transform_args: list[object] = [TRANSFORMER / "transform.py", SOURCE_DB, SITE_DB]
    if include_icons:
        transform_args.append(CDN)
    transform_args.extend(["--langs", languages])
    run(*transform_args)
    validate()
    write_build_manifest(languages, include_icons)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("extract", "build", "validate", "refresh"))
    parser.add_argument("--maindata", help="Path containing the installed game's .rda archives")
    parser.add_argument("--langs", default="english", help="Comma-separated languages for anno.sqlite")
    parser.add_argument(
        "--icons",
        action="store_true",
        help="Also extract DDS files and create the full local 256px PNG tree (large)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command in ("extract", "refresh"):
        extract(resolve_maindata(args.maindata), args.icons)
    if args.command in ("build", "refresh"):
        build(args.langs, args.icons)
    elif args.command == "validate":
        validate()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
