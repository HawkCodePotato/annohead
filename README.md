# annohead local data pipeline

This repository extracts current Anno 117 game data from the installed `.rda`
archives and transforms it into a normalized SQLite database. Patch archives are
layered in the same order as the game, so a new extraction reflects the locally
installed game version.

The pipeline is local-only. It does not upload anything and does not require Bun,
Node.js, rclone, or a CDN account. Python 3.10+ is sufficient for data-only builds;
[Pillow](https://pypi.org/project/pillow/) is additionally required when building
icons.

## Configure the game path

Pass the path on the command line:

```powershell
python pipeline.py refresh --maindata "D:\Games\Anno 117 - Pax Romana\maindata"
```

Or create an ignored `annohead.local.json` file beside `pipeline.py`:

```json
{
  "maindata": "D:/Games/Anno 117 - Pax Romana/maindata"
}
```

The `ANNO117_MAINDATA` environment variable is also supported. Command-line,
environment, and local-config values are considered in that order. If none is
provided, the pipeline searches the registered Steam libraries automatically.

## Commands

```powershell
# Extract configuration and localization only. This is the normal update path.
python pipeline.py extract

# Rebuild source.sqlite and the English anno.sqlite from existing extraction.
python pipeline.py build

# Extract, rebuild, and run all validation in one command.
python pipeline.py refresh

# Check the existing database without rebuilding it.
python pipeline.py validate
```

English is the default. Multiple languages can be requested explicitly:

```powershell
python pipeline.py refresh --langs english,german
```

Game images are large and are deliberately opt-in:

```powershell
python pipeline.py refresh --icons
```

That command extracts the relevant DDS files and creates a local 256px PNG tree
under `data/cdn`. Add `--icon-size 128` (or any other pixel size) to make them smaller. It still does not upload anything. Prefer uploading or copying
only the subset your site references; do not point the old `rclone sync` command
at a shared CDN because sync may remove unrelated remote files.

## Generated layers

- `data/extracted`: current XML and, with `--icons`, DDS files plus an RDA provider manifest.
- `data/source.sqlite`: fully resolved assets, reverse GUID references, and localization.
- `data/anno.sqlite`: normalized site tables.
- `data/extraction-info.json`: Steam build ID and a name/size/time fingerprint of the installed RDA set.
- `data/build-manifest.json`: database hashes, languages, source archive names, game build ID, and generation time.
- `data/cdn`: optional 256px PNG files, preserving the game's icon paths.

Database creation uses staging files and validation before replacing the last good
database. Extraction and icon directories are similarly swapped only after a new
version has completed successfully.

## Tests

From the repository root:

```powershell
python packages/data-extractor/test_rda.py
python packages/data-transformer/test_assets.py
python packages/data-transformer/check_site.py data/anno.sqlite
```

The first two tests are synthetic and require no installed game data. The final
check validates known facts in a generated or supplied `anno.sqlite` database.

## Repository status

The current schema remains young and should be reviewed before automatically
publishing newly discovered assets. In particular, game data can include campaign
objects, construction phases, internal variants, and content not suitable for a
public building list. Consumers should preserve stable site IDs and curated fields,
and produce a change report before applying additions or removals.
