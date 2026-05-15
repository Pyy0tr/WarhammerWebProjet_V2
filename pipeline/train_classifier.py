"""
train_classifier.py
-------------------
Fine-tunes DistilBERT for multi-label effect classification on dataset_raw.jsonl.

Usage:
  data/ml/venv/bin/python pipeline/train_classifier.py

Output:
  data/ml/model/          — trained model + tokenizer
  data/ml/label_map.json  — effect-type → index mapping
  data/ml/metrics.json    — per-class and macro F1 on test set
"""

import json
import random
import os
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from transformers import (
    DistilBertTokenizerFast,
    DistilBertForSequenceClassification,
    get_linear_schedule_with_warmup,
)
from sklearn.metrics import f1_score, classification_report

# ── Config ────────────────────────────────────────────────────────────────────

ROOT       = Path(__file__).resolve().parents[1]
DATA_FILE  = ROOT / "data" / "ml" / "dataset_raw.jsonl"
MODEL_DIR  = ROOT / "data" / "ml" / "model"
LABEL_MAP  = ROOT / "data" / "ml" / "label_map.json"
METRICS_F  = ROOT / "data" / "ml" / "metrics.json"

MODEL_NAME = "distilbert-base-uncased"
MAX_LEN    = 128
BATCH_SIZE = 16          # fits 2 GB VRAM with fp16
EPOCHS     = 5
LR         = 3e-5
WARMUP     = 0.1         # fraction of total steps
SEED       = 42
THRESHOLD  = 0.4         # sigmoid threshold for positive label

EFFECT_TYPES = [
    "HIT_MODIFIER",
    "WOUND_MODIFIER",
    "AP_MODIFIER",
    "DAMAGE_MODIFIER",
    "ATTACKS_MODIFIER",
    "STRENGTH_MODIFIER",
    "REROLL_HITS",
    "REROLL_WOUNDS",
    "REROLL_SAVES",
    "LETHAL_HITS",
    "SUSTAINED_HITS",
    "DEVASTATING_WOUNDS",
    "TWIN_LINKED",
    "TORRENT",
    "IGNORES_COVER",
    "LANCE",
    "MELTA",
    "FEEL_NO_PAIN",
    "MORTAL_WOUNDS",
    # Défenseur
    "INVULN_SAVE",
    "DAMAGE_REDUCTION",
    "DAMAGE_HALVED",
    "COVER",
    "BATTLESHOCK_IMMUNITY",
    # Utilitaire
    "MOVE_MODIFIER",
    "OC_MODIFIER",
    # Seuils critiques
    "CRITICAL_HIT_ON",
    "CRITICAL_WOUND_ON",
    # Manipulation de dé
    "SET_ROLL_TO_6",
]
NUM_LABELS = len(EFFECT_TYPES)
TYPE2IDX   = {t: i for i, t in enumerate(EFFECT_TYPES)}


# ── Dataset ───────────────────────────────────────────────────────────────────

def load_examples():
    examples = []
    with open(DATA_FILE) as f:
        for line in f:
            ex = json.loads(line)
            text    = ex["text"]
            effects = {e["type"] for e in ex["labels"]["effects"]}
            vec     = [1.0 if t in effects else 0.0 for t in EFFECT_TYPES]
            examples.append({"text": text, "labels": vec})
    return examples


class RulesDataset(Dataset):
    def __init__(self, examples, tokenizer):
        self.examples  = examples
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        ex  = self.examples[idx]
        enc = self.tokenizer(
            ex["text"],
            max_length=MAX_LEN,
            truncation=True,
            padding="max_length",
            return_tensors="pt",
        )
        return {
            "input_ids":      enc["input_ids"].squeeze(0),
            "attention_mask": enc["attention_mask"].squeeze(0),
            "labels":         torch.tensor(ex["labels"], dtype=torch.float32),
        }


# ── Train / eval helpers ──────────────────────────────────────────────────────

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def split(examples, train=0.80, val=0.10):
    random.shuffle(examples)
    n     = len(examples)
    t_end = int(n * train)
    v_end = int(n * (train + val))
    return examples[:t_end], examples[t_end:v_end], examples[v_end:]


def evaluate(model, loader, device):
    model.eval()
    all_preds, all_labels = [], []
    with torch.no_grad():
        for batch in loader:
            ids   = batch["input_ids"].to(device)
            mask  = batch["attention_mask"].to(device)
            labs  = batch["labels"].numpy()
            logits = model(input_ids=ids, attention_mask=mask).logits
            probs  = torch.sigmoid(logits).cpu().numpy()
            preds  = (probs >= THRESHOLD).astype(int)
            all_preds.append(preds)
            all_labels.append(labs)
    preds  = np.vstack(all_preds)
    labels = np.vstack(all_labels)
    macro  = f1_score(labels, preds, average="macro",  zero_division=0)
    micro  = f1_score(labels, preds, average="micro",  zero_division=0)
    return macro, micro, preds, labels


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    set_seed(SEED)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[train] device: {device}")

    print("[train] Loading examples...")
    examples = load_examples()
    print(f"[train] {len(examples)} examples | {NUM_LABELS} labels")

    train_ex, val_ex, test_ex = split(examples)
    print(f"[train] split: {len(train_ex)} train / {len(val_ex)} val / {len(test_ex)} test")

    print(f"[train] Loading tokenizer: {MODEL_NAME}")
    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_NAME)

    train_ds = RulesDataset(train_ex, tokenizer)
    val_ds   = RulesDataset(val_ex,   tokenizer)
    test_ds  = RulesDataset(test_ex,  tokenizer)

    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=2)
    val_dl   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=2)
    test_dl  = DataLoader(test_ds,  batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    print(f"[train] Loading model: {MODEL_NAME}")
    model = DistilBertForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=NUM_LABELS,
        problem_type="multi_label_classification",
    )
    model.to(device)

    total_steps  = len(train_dl) * EPOCHS
    warmup_steps = int(total_steps * WARMUP)
    optimizer    = AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    scheduler    = get_linear_schedule_with_warmup(optimizer, warmup_steps, total_steps)

    use_amp = device.type == "cuda"
    scaler  = torch.cuda.amp.GradScaler() if use_amp else None

    best_val_f1  = 0.0
    best_ckpt    = MODEL_DIR / "best"

    for epoch in range(1, EPOCHS + 1):
        model.train()
        total_loss = 0.0
        for step, batch in enumerate(train_dl, 1):
            ids   = batch["input_ids"].to(device)
            mask  = batch["attention_mask"].to(device)
            labs  = batch["labels"].to(device)

            optimizer.zero_grad()
            if use_amp:
                with torch.cuda.amp.autocast():
                    out  = model(input_ids=ids, attention_mask=mask, labels=labs)
                    loss = out.loss
                scaler.scale(loss).backward()
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                scaler.step(optimizer)
                scaler.update()
            else:
                out  = model(input_ids=ids, attention_mask=mask, labels=labs)
                loss = out.loss
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
            scheduler.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(train_dl)
        val_macro, val_micro, _, _ = evaluate(model, val_dl, device)
        print(f"  epoch {epoch}/{EPOCHS}  loss={avg_loss:.4f}  val_macro_f1={val_macro:.3f}  val_micro_f1={val_micro:.3f}")

        if val_macro > best_val_f1:
            best_val_f1 = val_macro
            best_ckpt.mkdir(parents=True, exist_ok=True)
            model.save_pretrained(best_ckpt)
            tokenizer.save_pretrained(best_ckpt)
            print(f"    ↑ saved best checkpoint (macro_f1={val_macro:.3f})")

    print("\n[train] Evaluating best checkpoint on test set...")
    model = DistilBertForSequenceClassification.from_pretrained(best_ckpt)
    model.to(device)
    test_macro, test_micro, preds, labels = evaluate(model, test_dl, device)
    print(f"  test macro_f1={test_macro:.3f}  micro_f1={test_micro:.3f}")

    report = classification_report(
        labels, preds,
        target_names=EFFECT_TYPES,
        zero_division=0,
        output_dict=True,
    )
    print("\n  Per-class F1:")
    for label in EFFECT_TYPES:
        r = report[label]
        print(f"    {label:30s}  P={r['precision']:.2f}  R={r['recall']:.2f}  F1={r['f1-score']:.2f}  support={r['support']:.0f}")

    metrics = {
        "test_macro_f1": round(test_macro, 4),
        "test_micro_f1": round(test_micro, 4),
        "per_class":     {
            t: {
                "precision": round(report[t]["precision"], 3),
                "recall":    round(report[t]["recall"],    3),
                "f1":        round(report[t]["f1-score"],  3),
                "support":   int(report[t]["support"]),
            }
            for t in EFFECT_TYPES
        },
    }
    with open(METRICS_F, "w") as f:
        json.dump(metrics, f, indent=2)
    with open(LABEL_MAP, "w") as f:
        json.dump(TYPE2IDX, f, indent=2)

    print(f"\n[train] Wrote {METRICS_F.name} and {LABEL_MAP.name}")
    print(f"[train] Best model saved to {best_ckpt}")


if __name__ == "__main__":
    main()
