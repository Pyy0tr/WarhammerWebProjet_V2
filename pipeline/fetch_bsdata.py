"""
fetch_bsdata.py
---------------
Télécharge le dernier release BSData wh40k-10e depuis GitHub
et extrait les fichiers .cat dans data/raw/.

Usage :
    python pipeline/fetch_bsdata.py

Variables d'environnement optionnelles :
    BSDATA_REPO   : repo GitHub (défaut: BSData/wh40k-10e)
    GITHUB_TOKEN  : token GitHub pour éviter le rate-limit (optionnel)
"""

import io
import json
import os
import zipfile
from pathlib import Path

import requests

BSDATA_REPO = os.getenv("BSDATA_REPO", "BSData/wh40k-10e")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
API_URL = f"https://api.github.com/repos/{BSDATA_REPO}/releases/latest"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_RAW_DIR = PROJECT_ROOT / "data" / "raw"
VERSION_FILE = PROJECT_ROOT / "data" / "version.json"


def get_headers():
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def get_latest_release():
    print(f"Interrogation de l'API GitHub : {API_URL}")
    response = requests.get(API_URL, headers=get_headers(), timeout=10)
    response.raise_for_status()
    data = response.json()
    return {
        "tag": data["tag_name"],
        "zipball_url": data["zipball_url"],
        "published_at": data["published_at"],
    }


def get_current_version():
    if VERSION_FILE.exists():
        with open(VERSION_FILE) as f:
            return json.load(f).get("tag")
    return None


def save_version(release_info):
    with open(VERSION_FILE, "w") as f:
        json.dump(release_info, f, indent=2)


def download_and_extract(zipball_url):
    print(f"Téléchargement du release...")
    response = requests.get(
        zipball_url, headers=get_headers(), timeout=120, stream=True
    )
    response.raise_for_status()

    total = int(response.headers.get("content-length", 0))
    downloaded = 0
    chunks = []

    for chunk in response.iter_content(chunk_size=1024 * 1024):
        chunks.append(chunk)
        downloaded += len(chunk)
        if total:
            pct = downloaded / total * 100
            print(f"\r  {downloaded // (1024*1024)} MB / {total // (1024*1024)} MB ({pct:.0f}%)", end="", flush=True)

    print()
    content = b"".join(chunks)

    print(f"Extraction des fichiers .cat...")
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)

    # Vider le dossier raw avant d'extraire
    for existing in DATA_RAW_DIR.glob("*.cat"):
        existing.unlink()

    extracted_count = 0
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        for name in zf.namelist():
            if name.endswith(".cat") or name.endswith(".gst"):
                # Aplatir la structure — on garde juste le nom de fichier
                filename = Path(name).name
                target = DATA_RAW_DIR / filename
                target.write_bytes(zf.read(name))
                extracted_count += 1

    return extracted_count


def main():
    print("=== BSData Fetch ===")
    print(f"Repo : {BSDATA_REPO}")
    print(f"Destination : {DATA_RAW_DIR}")
    print()

    release = get_latest_release()
    print(f"Dernier release : {release['tag']} (publié le {release['published_at']})")

    current = get_current_version()
    if current == release["tag"]:
        print(f"Déjà à jour ({current}). Rien à faire.")
        return

    if current:
        print(f"Mise à jour : {current} → {release['tag']}")
    else:
        print("Première installation.")

    count = download_and_extract(release["zipball_url"])
    save_version(release)

    print()
    print(f"Terminé. {count} fichiers extraits dans data/raw/")
    print(f"Version enregistrée : {release['tag']}")


if __name__ == "__main__":
    main()
