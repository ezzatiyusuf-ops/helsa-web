#!/usr/bin/env python3
"""Build a descriptive-name map for numbered pexels images.

Priority for the canonical name: product slug > tray slug > category slug >
blog slug > gift slug. Output: scripts/image-map.json
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def psql(sql: str) -> list[str]:
    r = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "helsa_db", "-t", "-A", "-c", sql],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        return []
    return [l for l in r.stdout.splitlines() if l.strip()]

PEXELS = re.compile(r"/images/pexels/\d+\.jpg")

def collect_sources():
    refs: list[tuple[str, str]] = []  # (priority, pexels_path)
    # 1) products
    for row in psql("SELECT slug, image FROM products"):
        slug, image = row.split("|", 1)
        if PEXELS.search(image or ""):
            refs.append((f"p:{slug}", image))
    for row in psql("SELECT slug, jsonb_array_elements_text(gallery) FROM products"):
        slug, image = row.split("|", 1)
        if PEXELS.search(image or ""):
            refs.append((f"p:{slug}", image))
    # 2) trays
    for row in psql("SELECT slug, image FROM mazeh_trays"):
        slug, image = row.split("|", 1)
        if PEXELS.search(image or ""):
            refs.append((f"t:{slug}", image))
    # 3) categories
    for row in psql("SELECT slug, image FROM categories"):
        slug, image = row.split("|", 1)
        if PEXELS.search(image or ""):
            refs.append((f"c:{slug}", image))
    # 4) blog posts (static content)
    content = (ROOT / "src/data/content.ts").read_text(encoding="utf-8")
    for m in re.finditer(r'slug: "([^"]+)",[\s\S]{0,400}?image: "(/images/pexels/\d+\.jpg)"', content):
        refs.append((f"b:{m.group(1)}", m.group(2)))
    # 5) gift packages
    for row in psql("SELECT slug, image FROM gift_packages"):
        slug, image = row.split("|", 1)
        if PEXELS.search(image or ""):
            refs.append((f"g:{slug}", image))
    return refs

def main():
    refs = collect_sources()
    # iterate in priority order (products first — refs are already ordered),
    # assigning each unique source a unique descriptive target name.
    used: set[str] = set()
    mapping: dict[str, str] = {}

    def assign(path: str, base: str):
        if path in mapping:
            return
        name = f"/images/opt/{base}.jpg"
        n = 2
        while name in used:
            name = f"/images/opt/{base}-{n}.jpg"
            n += 1
        mapping[path] = name
        used.add(name)

    for prio, path in refs:
        _, slug = prio.split(":", 1)
        assign(path, slug)

    # every pexels file on disk that is referenced anywhere should map
    disk = [f"/images/pexels/{p.name}" for p in (ROOT / "public/images/pexels").glob("*.jpg")]
    referenced = {path for _, path in refs}
    for path in sorted(set(disk) - referenced):
        print(f"  · unreferenced on disk: {path}")

    out = ROOT / "scripts/image-map.json"
    out.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"mapped {len(mapping)} images -> {out}")

if __name__ == "__main__":
    main()
