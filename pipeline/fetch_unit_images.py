"""
fetch_unit_images.py
--------------------
Fetches unit image URLs from the Warhammer 40K Fandom wiki.
Outputs: frontend/public/data/unit_images.json  { unit_id: image_url }

Usage:
  python3 pipeline/fetch_unit_images.py              # fetch URLs only (fast)
  python3 pipeline/fetch_unit_images.py --download   # also download as WebP
  python3 pipeline/fetch_unit_images.py --limit 50   # test on first 50 units
"""

import json
import sys
import time
import re
import urllib.request
import urllib.parse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Semaphore

# ── Config ────────────────────────────────────────────────────────────────────

ROOT      = Path(__file__).resolve().parents[1]
UNITS_F   = ROOT / "frontend" / "public" / "data" / "units.json"
OUT_FILE  = ROOT / "frontend" / "public" / "data" / "unit_images.json"
IMG_DIR   = ROOT / "frontend" / "public" / "images" / "units"

WIKI_API  = "https://warhammer40k.fandom.com/api.php"
IMG_WIDTH = 400          # px for thumbnails
MAX_WORKERS = 6          # concurrent threads
RATE_SEM  = Semaphore(MAX_WORKERS)
HEADERS   = {"User-Agent": "ProbHammer/1.0 (community tool; github.com)"}

# Skip filenames containing these strings (likely not unit renders)
SKIP_KEYWORDS = [
    "icon", "logo", "banner", "symbol", "badge", "crest",
    "warscroll", "datasheet", "map", "artwork_old", "portrait",
    "screenshot", "warhammer_fantasy", "age_of_sigmar",
    "cover", "codex", "rulebook", "book_cover",
]

# Boost: likely a painted miniature / studio model photo
MINIATURE_KEYWORDS = [
    "miniature", "mini", "model", "painted", "render",
    "fig", "figure", "squad", "unit",
]

# Penalise: likely concept art / illustration
ARTWORK_KEYWORDS = [
    "artwork", "art_by", "illustration", "concept", "drawing",
    "official_art",
]

# ── HTTP helper ───────────────────────────────────────────────────────────────

def wiki_get(params: dict, retries: int = 3) -> dict:
    params["format"] = "json"
    url = WIKI_API + "?" + urllib.parse.urlencode(params)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as r:
                return json.loads(r.read())
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 ** attempt)
    return {}

# ── Image quality scoring ─────────────────────────────────────────────────────

def score_image(file_title: str, unit_name: str) -> int:
    """Higher = better match. Returns -1 to skip entirely."""
    name = file_title.lower().replace("file:", "")

    # Hard skip
    for kw in SKIP_KEYWORDS:
        if kw in name:
            return -1

    score = 0

    # Reward filename overlap with unit name tokens
    unit_tokens = set(re.sub(r"[^a-z0-9 ]", "", unit_name.lower()).split())
    file_tokens = set(re.sub(r"[^a-z0-9]", " ", name).split())
    overlap = len(unit_tokens & file_tokens)
    score += overlap * 10

    # Boost: miniature/model indicators (only count the first match to avoid stacking)
    for kw in MINIATURE_KEYWORDS:
        if kw in name:
            score += 8
            break

    # Penalise: artwork/illustration indicators
    for kw in ARTWORK_KEYWORDS:
        if kw in name:
            score -= 8

    # Slight preference for jpg (more likely a render than a .png icon)
    if name.endswith(".jpg"):
        score += 2

    # Penalise very short names (often logos)
    if len(name) < 10:
        score -= 5

    return score


def best_image(images: list[dict], unit_name: str) -> str | None:
    """Return the File: title with the best score, or None."""
    scored = []
    for img in images:
        t = img.get("title", "")
        if not t.lower().endswith((".jpg", ".png")):
            continue
        s = score_image(t, unit_name)
        if s >= 0:
            scored.append((s, t))
    if not scored:
        return None
    scored.sort(reverse=True)
    return scored[0][1]


# ── Wiki lookup ───────────────────────────────────────────────────────────────

def search_unit(unit_name: str) -> str | None:
    """Return best File: title for the unit, or None."""
    try:
        # Step 1 — find wiki page
        data = wiki_get({
            "action": "query",
            "list": "search",
            "srsearch": unit_name,
            "srlimit": 3,
            "srnamespace": 0,
        })
        results = data.get("query", {}).get("search", [])
        if not results:
            return None
        page_title = results[0]["title"]

        # Step 2 — get images on that page
        data2 = wiki_get({
            "action": "query",
            "titles": page_title,
            "prop": "images",
            "imlimit": 25,
        })
        pages = data2.get("query", {}).get("pages", {})
        all_images = []
        for page in pages.values():
            all_images.extend(page.get("images", []))

        return best_image(all_images, unit_name)

    except Exception:
        return None


def resolve_file_urls(file_titles: list[str]) -> dict[str, str]:
    """Batch-resolve File: titles → CDN URLs (50 per API call)."""
    result = {}
    for i in range(0, len(file_titles), 50):
        batch = file_titles[i : i + 50]
        try:
            data = wiki_get({
                "action": "query",
                "titles": "|".join(batch),
                "prop": "imageinfo",
                "iiprop": "url",
                "iiurlwidth": IMG_WIDTH,
            })
            pages = data.get("query", {}).get("pages", {})
            for page in pages.values():
                title = page.get("title", "")
                info  = page.get("imageinfo", [])
                if info:
                    url = info[0].get("thumburl") or info[0].get("url")
                    if url:
                        result[title] = url
        except Exception:
            pass
        time.sleep(0.3)
    return result


# ── Main pipeline ─────────────────────────────────────────────────────────────

def process_unit(unit: dict) -> tuple[str, str | None]:
    """Thread worker: unit_id → (unit_id, file_title | None)."""
    with RATE_SEM:
        file_title = search_unit(unit["name"])
        time.sleep(0.2)  # polite rate limiting
    return unit["id"], file_title


def main():
    download   = "--download" in sys.argv
    limit_arg  = next((sys.argv[sys.argv.index("--limit") + 1]
                       for i, a in enumerate(sys.argv) if a == "--limit"),
                      None) if "--limit" in sys.argv else None
    limit      = int(limit_arg) if limit_arg else None

    units = json.loads(UNITS_F.read_text())
    if limit:
        units = units[:limit]

    # Load existing results to resume interrupted runs
    existing: dict[str, str] = {}
    if OUT_FILE.exists():
        existing = json.loads(OUT_FILE.read_text())
    print(f"[images] {len(existing)} already resolved, {len(units)} total units")

    # Filter units not yet processed
    todo = [u for u in units if u["id"] not in existing]
    print(f"[images] {len(todo)} units to fetch …")

    # ── Step 1: find File: titles ─────────────────────────────────────────────
    id_to_file: dict[str, str] = {}
    done, errors = 0, 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(process_unit, u): u for u in todo}
        for future in as_completed(futures):
            unit_id, file_title = future.result()
            if file_title:
                id_to_file[unit_id] = file_title
                done += 1
            else:
                errors += 1
            total = done + errors
            if total % 50 == 0 or total == len(todo):
                pct = total / max(len(todo), 1) * 100
                print(f"  {total}/{len(todo)} ({pct:.0f}%)  found={done}  no_match={errors}")

    print(f"\n[images] Step 1 done — {done} images found, {errors} not matched")

    # ── Step 2: resolve File: titles → CDN URLs ───────────────────────────────
    file_titles = list(set(id_to_file.values()))
    print(f"[images] Resolving {len(file_titles)} unique file URLs …")
    file_to_url = resolve_file_urls(file_titles)
    print(f"[images] {len(file_to_url)} URLs resolved")

    # ── Build final map ───────────────────────────────────────────────────────
    new_map: dict[str, str] = {}
    for uid, ft in id_to_file.items():
        url = file_to_url.get(ft)
        if url:
            new_map[uid] = url

    # Merge with existing
    merged = {**existing, **new_map}
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(merged, separators=(",", ":")))
    print(f"\n[images] Saved {len(merged)} image URLs → {OUT_FILE}")
    print(f"[images] Coverage: {len(merged)}/{len(json.loads(UNITS_F.read_text()))} units "
          f"({len(merged)/len(json.loads(UNITS_F.read_text()))*100:.0f}%)")

    # ── Optional: download images as WebP ────────────────────────────────────
    if download:
        try:
            from PIL import Image
            import io
        except ImportError:
            print("\n[download] Pillow not installed — run: pip install Pillow")
            return

        IMG_DIR.mkdir(parents=True, exist_ok=True)
        downloaded = 0
        for uid, url in merged.items():
            dest = IMG_DIR / f"{uid}.webp"
            if dest.exists():
                continue
            try:
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=15) as r:
                    img = Image.open(io.BytesIO(r.read())).convert("RGBA")
                    # Resize to max 350px width
                    w, h = img.size
                    if w > 350:
                        img = img.resize((350, int(h * 350 / w)), Image.LANCZOS)
                    img.save(dest, "WEBP", quality=75)
                    downloaded += 1
                    if downloaded % 50 == 0:
                        print(f"  Downloaded {downloaded} images …")
                time.sleep(0.1)
            except Exception as e:
                print(f"  Error {uid}: {e}")

        total_mb = sum(f.stat().st_size for f in IMG_DIR.glob("*.webp")) / 1024 / 1024
        print(f"\n[download] {downloaded} images saved — {total_mb:.1f} MB total")


if __name__ == "__main__":
    main()
