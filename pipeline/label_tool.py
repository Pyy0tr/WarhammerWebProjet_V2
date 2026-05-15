"""
label_tool.py
-------------
Outil interactif de vérification / correction des labels ML.

Pour chaque exemple :
  1. Affiche le texte avec les tokens surlignés selon l'attention du modèle
  2. Affiche les probabilités prédites par classe
  3. Demande de confirmer ou corriger les labels
  4. Sauvegarde dans data/ml/dataset_verified.jsonl (human_verified=true)

Usage:
  data/ml/venv/bin/python pipeline/label_tool.py
  data/ml/venv/bin/python pipeline/label_tool.py --source stratagem
  data/ml/venv/bin/python pipeline/label_tool.py --source enhancement --only-simulatable
  data/ml/venv/bin/python pipeline/label_tool.py --disagreements   # modèle ≠ auto-labels
"""

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
import torch
from rich import print as rprint
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.prompt import Prompt
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification

ROOT        = Path(__file__).resolve().parents[1]
DATASET_F   = ROOT / "data" / "ml" / "dataset_raw.jsonl"
VERIFIED_F  = ROOT / "data" / "ml" / "dataset_verified.jsonl"
LABEL_MAP_F = ROOT / "data" / "ml" / "label_map.json"
MODEL_DIR   = ROOT / "data" / "ml" / "model" / "best"
MAX_LEN     = 128
THRESHOLD   = 0.35

console = Console()

EFFECT_TYPES = [
    "HIT_MODIFIER", "WOUND_MODIFIER", "AP_MODIFIER", "DAMAGE_MODIFIER",
    "ATTACKS_MODIFIER", "STRENGTH_MODIFIER", "REROLL_HITS", "REROLL_WOUNDS",
    "REROLL_SAVES", "LETHAL_HITS", "SUSTAINED_HITS", "DEVASTATING_WOUNDS",
    "TWIN_LINKED", "TORRENT", "IGNORES_COVER", "LANCE", "MELTA",
    "FEEL_NO_PAIN", "MORTAL_WOUNDS",
    # Défenseur
    "INVULN_SAVE", "DAMAGE_REDUCTION", "DAMAGE_HALVED", "COVER", "BATTLESHOCK_IMMUNITY",
    # Utilitaire
    "MOVE_MODIFIER", "OC_MODIFIER",
    # Seuils critiques
    "CRITICAL_HIT_ON", "CRITICAL_WOUND_ON",
    # Manipulation de dé
    "SET_ROLL_TO_6",
    # Debuffs défenseurs
    "DEBUFF_HIT_ROLL",
]
TYPE2IDX = {t: i for i, t in enumerate(EFFECT_TYPES)}

# ── Couleurs par probabilité ──────────────────────────────────────────────────

def prob_color(p: float) -> str:
    if p >= 0.80: return "bright_green"
    if p >= 0.50: return "green"
    if p >= 0.30: return "yellow"
    if p >= 0.15: return "dark_orange"
    return "bright_black"

def attn_style(weight: float) -> str:
    """Retourne un style rich basé sur le poids d'attention normalisé (0-1)."""
    if weight >= 0.80: return "bold bright_cyan on dark_cyan"
    if weight >= 0.60: return "bold cyan"
    if weight >= 0.40: return "cyan"
    if weight >= 0.25: return "bright_blue"
    return ""


# ── Inférence + attention ─────────────────────────────────────────────────────

def run_model(text: str, model, tokenizer, device):
    enc = tokenizer(
        text,
        max_length=MAX_LEN,
        truncation=True,
        padding="max_length",
        return_tensors="pt",
    )
    ids   = enc["input_ids"].to(device)
    mask  = enc["attention_mask"].to(device)

    with torch.no_grad():
        out = model(
            input_ids=ids,
            attention_mask=mask,
            output_attentions=True,
        )

    probs    = torch.sigmoid(out.logits[0]).cpu().numpy()
    # Attention : shape (n_layers, batch, n_heads, seq, seq)
    # On prend les 2 dernières couches, attention du token [CLS] → tous les tokens
    attns = out.attentions  # tuple of (1, n_heads, seq, seq)
    last2 = torch.stack([attns[-1][0], attns[-2][0]])  # (2, n_heads, seq, seq)
    cls_attn = last2[:, :, 0, :].mean(dim=(0, 1))      # (seq,)
    cls_attn = cls_attn.cpu().numpy()

    input_ids    = enc["input_ids"][0].tolist()
    token_strs   = tokenizer.convert_ids_to_tokens(input_ids)
    attn_mask    = enc["attention_mask"][0].tolist()

    # Garder seulement les vrais tokens (pas le padding, pas [SEP])
    real_tokens = []
    real_attns  = []
    for tok, att, mask_val in zip(token_strs, cls_attn, attn_mask):
        if mask_val == 0: break
        if tok in ("[CLS]", "[SEP]"): continue
        real_tokens.append(tok)
        real_attns.append(att)

    # Normaliser l'attention sur [0, 1]
    a = np.array(real_attns)
    if a.max() > a.min():
        a = (a - a.min()) / (a.max() - a.min())
    real_attns = a.tolist()

    return probs, real_tokens, real_attns


def build_highlighted_text(tokens: list[str], attns: list[float]) -> Text:
    """Reconstitue le texte avec highlighting selon les poids d'attention."""
    text = Text()
    for tok, att in zip(tokens, attns):
        word = tok.replace("##", "")  # sous-mots DistilBERT
        style = attn_style(att)
        if tok.startswith("##"):
            text.append(word, style=style)
        else:
            text.append(" " + word, style=style)
    return text


# ── Affichage d'un exemple ────────────────────────────────────────────────────

def display_example(ex: dict, probs: np.ndarray, tokens: list, attns: list, idx: int, total: int):
    console.rule(f"[bold]Exemple {idx}/{total}[/bold]")

    # Métadonnées
    src  = ex.get("source_type", "?")
    name = ex.get("name", "?")
    fac  = ex.get("faction", "")
    det  = ex.get("detachment", "")
    meta = f"[dim]{src}[/dim] · [bold]{name}[/bold]"
    if fac: meta += f" · {fac}"
    if det: meta += f" / {det}"
    rprint(meta)

    # Texte surlighté
    highlighted = build_highlighted_text(tokens, attns)
    console.print(Panel(highlighted, title="[cyan]Texte[/cyan] [dim](surligné par attention)[/dim]", border_style="dim"))

    # Légende
    rprint("[dim]Attention : [bold bright_cyan]███[/] fort  [cyan]███[/] moyen  [bright_blue]███[/] faible[/dim]")
    console.print()

    # Tableau des probabilités
    auto_effects = {e["type"] for e in ex["labels"]["effects"]}
    predicted    = {EFFECT_TYPES[i] for i, p in enumerate(probs) if p >= THRESHOLD}
    agree        = auto_effects == predicted

    table = Table(show_header=True, header_style="bold", border_style="dim", box=None)
    table.add_column("Classe", width=28)
    table.add_column("Probabilité", width=24)
    table.add_column("Auto-label", width=12)
    table.add_column("Modèle", width=10)

    for etype in EFFECT_TYPES:
        i    = TYPE2IDX[etype]
        auto = "✓" if etype in auto_effects else ""
        if i >= len(probs):
            table.add_row(f"[dim]{etype}[/dim]", "[dim]— (retrain needed)[/dim]",
                          f"[green]{auto}[/]", "")
            continue
        p    = probs[i]
        bar  = "█" * int(p * 20) + "░" * (20 - int(p * 20))
        col  = prob_color(p)
        pred = f"[{col}]✓[/]" if p >= THRESHOLD else ""
        table.add_row(
            f"[{col}]{etype}[/]" if p >= 0.15 else f"[dim]{etype}[/dim]",
            f"[{col}]{bar}[/] [dim]{p:.2f}[/dim]",
            f"[green]{auto}[/]",
            pred,
        )

    console.print(table)
    if agree:
        rprint("[dim]Auto-label et modèle sont d'accord.[/dim]")
    else:
        rprint("[yellow]⚠ Désaccord entre auto-label et modèle.[/yellow]")
    console.print()


# ── Interaction utilisateur ───────────────────────────────────────────────────

def prompt_labels(probs: np.ndarray, ex: dict) -> list[dict] | None:
    """
    Retourne la liste d'effets corrigée, ou None si skip, ou 'quit'.
    """
    predicted = [EFFECT_TYPES[i] for i, p in enumerate(probs) if i < len(EFFECT_TYPES) and p >= THRESHOLD]
    pred_str  = ", ".join(predicted) if predicted else "(aucun)"

    rprint(f"[dim]Prédiction modèle :[/] [cyan]{pred_str}[/]")
    rprint("[dim]Commandes :[/dim]")
    rprint("  [bold]Enter[/bold]        → accepter la prédiction du modèle")
    rprint("  [bold]auto[/bold]         → accepter l'auto-label regex")
    rprint("  [bold]none[/bold]         → aucun effet (non simulable)")
    rprint("  [bold]HIT,WOUND,...[/bold] → entrer les types manuellement (séparés par virgule)")
    rprint("  [bold]s[/bold]            → passer cet exemple")
    rprint("  [bold]q[/bold]            → quitter")
    console.print()

    answer = Prompt.ask("[bold cyan]Votre choix[/bold cyan]", default="")

    if answer.strip().lower() == "q":
        return "quit"
    if answer.strip().lower() == "s":
        return None
    if answer.strip() == "" :
        return [{"type": t} for t in predicted]
    if answer.strip().lower() == "auto":
        return ex["labels"]["effects"]
    if answer.strip().lower() == "none":
        return []

    # Entrée manuelle
    parts = [p.strip().upper() for p in answer.split(",")]
    valid = [p for p in parts if p in TYPE2IDX]
    invalid = [p for p in parts if p not in TYPE2IDX]
    if invalid:
        rprint(f"[red]Types inconnus ignorés : {invalid}[/red]")
    return [{"type": t} for t in valid]


# ── Chargement des exemples déjà vérifiés ─────────────────────────────────────

def load_verified_ids() -> set[str]:
    if not VERIFIED_F.exists():
        return set()
    ids = set()
    with open(VERIFIED_F) as f:
        for line in f:
            try:
                ids.add(json.loads(line)["id"])
            except Exception:
                pass
    return ids


def save_verified(ex: dict, effects: list[dict]):
    updated = dict(ex)
    updated["labels"] = dict(ex["labels"])
    updated["labels"]["effects"]    = effects
    updated["labels"]["simulatable"] = len(effects) > 0
    updated["labels"]["confidence"] = 1.0
    updated["human_verified"] = True

    with open(VERIFIED_F, "a") as f:
        f.write(json.dumps(updated, ensure_ascii=False) + "\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=["stratagem", "enhancement", "unit_ability"],
                        help="Filtrer par type de source")
    parser.add_argument("--only-simulatable", action="store_true",
                        help="Seulement les exemples auto-labellisés comme simulables")
    parser.add_argument("--disagreements", action="store_true",
                        help="Seulement les exemples où modèle ≠ auto-label")
    parser.add_argument("--skip-verified", action="store_true", default=True,
                        help="Passer les exemples déjà vérifiés (défaut: oui)")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    console.print(f"[dim]Device : {device} | Modèle : {MODEL_DIR}[/dim]")

    console.print("[dim]Chargement du modèle...[/dim]")
    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
    model     = DistilBertForSequenceClassification.from_pretrained(
        MODEL_DIR, attn_implementation="eager"
    )
    model.to(device)
    model.eval()

    console.print("[dim]Chargement du dataset...[/dim]")
    with open(DATASET_F) as f:
        examples = [json.loads(l) for l in f]

    verified_ids = load_verified_ids()
    console.print(f"[dim]{len(verified_ids)} exemples déjà vérifiés[/dim]\n")

    # Filtres
    if args.source:
        examples = [e for e in examples if e["source_type"] == args.source]
    if args.only_simulatable:
        examples = [e for e in examples if e["labels"]["simulatable"]]
    if args.skip_verified:
        examples = [e for e in examples if e["id"] not in verified_ids]

    random.shuffle(examples)

    # Pré-filtrage "disagreements" : on doit inférer d'abord
    # (fait à la volée ci-dessous si --disagreements)

    total = len(examples)
    console.print(f"[bold]{total}[/bold] exemples à traiter\n")

    saved = 0
    shown = 0

    for ex in examples:
        probs, tokens, attns = run_model(ex["text"], model, tokenizer, device)

        # Filtre disagreements
        if args.disagreements:
            auto_effects = {e["type"] for e in ex["labels"]["effects"]}
            predicted    = {EFFECT_TYPES[i] for i, p in enumerate(probs) if i < len(EFFECT_TYPES) and p >= THRESHOLD}
            if auto_effects == predicted:
                continue

        shown += 1
        display_example(ex, probs, tokens, attns, shown, total)
        result = prompt_labels(probs, ex)

        if result == "quit":
            break
        if result is None:
            rprint("[dim]→ Passé[/dim]\n")
            continue

        save_verified(ex, result)
        saved += 1
        rprint(f"[green]→ Sauvegardé[/green] · effets : {[e['type'] for e in result]}\n")

    console.rule()
    rprint(f"[bold green]{saved}[/bold green] exemples vérifiés sauvegardés dans [dim]{VERIFIED_F.name}[/dim]")


if __name__ == "__main__":
    main()
