"""
fetch_bsdata_v11.py
--------------------
Pipeline de STAGING pour la V11 — n'écrit jamais dans frontend/public/ et ne
touche à aucun fichier du pipeline V10 (fetch_bsdata.py / data/raw/ etc.).

Télécharge la dernière version du repo communautaire wh40k-11e depuis GitHub
(branche main) et extrait les fichiers .json (un par faction + le gameSystem)
dans data/raw_v11/.

Contrairement à wh40k-10e (BattleScribe XML .cat/.gst), ce repo publie
directement le même arbre BattleScribe sérialisé en JSON.

Usage :
    python pipeline/fetch_bsdata_v11.py

Variables d'environnement optionnelles :
    BSDATA_V11_REPO : repo GitHub (défaut: BSData/wh40k-11e)
    GITHUB_TOKEN    : token GitHub pour éviter le rate-limit (optionnel)
"""

import io
import json
import os
import zipfile
from pathlib import Path

import requests

BSDATA_V11_REPO = os.getenv("BSDATA_V11_REPO", "BSData/wh40k-11e")
GITHUB_TOKEN     = os.getenv("GITHUB_TOKEN", "")
BRANCH           = "main"
COMMIT_URL       = f"https://api.github.com/repos/{BSDATA_V11_REPO}/commits/{BRANCH}"
ZIPBALL_URL      = f"https://api.github.com/repos/{BSDATA_V11_REPO}/zipball/{BRANCH}"

PROJECT_ROOT   = Path(__file__).resolve().parent.parent
DATA_RAW_DIR   = PROJECT_ROOT / "data" / "raw_v11"
VERSION_FILE   = PROJECT_ROOT / "data" / "version_v11.json"

# Fichiers présents dans le repo mais qui ne sont pas des données de jeu.
EXCLUDED_NAMES = {"readme.md"}


def get_headers():
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def get_latest_commit():
    """Retourne le SHA et la date du dernier commit sur main."""
    response = requests.get(COMMIT_URL, headers=get_headers(), timeout=10)
    response.raise_for_status()
    data = response.json()
    return {
        "sha":          data["sha"],
        "sha_short":    data["sha"][:8],
        "committed_at": data["commit"]["committer"]["date"],
        "message":      data["commit"]["message"].splitlines()[0][:80],
    }


def get_current_sha():
    if VERSION_FILE.exists():
        return json.load(open(VERSION_FILE)).get("sha")
    return None


def save_version(commit_info):
    with open(VERSION_FILE, "w") as f:
        json.dump(commit_info, f, indent=2)


def download_and_extract():
    print(f"Téléchargement de la branche {BRANCH}...")
    response = requests.get(
        ZIPBALL_URL, headers=get_headers(), timeout=180, stream=True
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
            print(f"\r  {downloaded // (1024*1024)} MB / {total // (1024*1024)} MB ({pct:.0f}%)",
                  end="", flush=True)
    print()

    content = b"".join(chunks)
    print("Extraction des fichiers .json...")
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)

    for existing in DATA_RAW_DIR.glob("*.json"):
        existing.unlink()

    count = 0
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        for name in zf.namelist():
            if not name.endswith(".json"):
                continue
            filename = Path(name).name
            if filename.lower() in EXCLUDED_NAMES:
                continue
            (DATA_RAW_DIR / filename).write_bytes(zf.read(name))
            count += 1

    return count


def set_gha_output(key: str, value: str):
    """Écrit un output GitHub Actions si on est dans ce contexte."""
    gha_output = os.getenv("GITHUB_OUTPUT")
    if gha_output:
        with open(gha_output, "a") as f:
            f.write(f"{key}={value}\n")


def main():
    print("=== BSData V11 Fetch — STAGING (branche main) ===")
    print(f"Repo        : {BSDATA_V11_REPO}")
    print(f"Destination : {DATA_RAW_DIR}")
    print()

    commit = get_latest_commit()
    print(f"Dernier commit : {commit['sha_short']}  ({commit['committed_at']})")
    print(f"  → {commit['message']}")

    current_sha = get_current_sha()
    if current_sha == commit["sha"]:
        print(f"\nDéjà à jour ({commit['sha_short']}). Rien à faire.")
        set_gha_output("updated", "false")
        return

    if current_sha:
        print(f"\nMise à jour : {current_sha[:8]} → {commit['sha_short']}")
    else:
        print("\nPremière installation.")

    count = download_and_extract()
    save_version(commit)
    set_gha_output("updated", "true")

    print(f"\nTerminé. {count} fichiers extraits dans data/raw_v11/")
    print(f"SHA enregistré : {commit['sha_short']}")


if __name__ == "__main__":
    main()
