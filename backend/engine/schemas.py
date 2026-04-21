"""
engine/schemas.py
-----------------
Pydantic models for the WH40K simulation engine.
Independent of FastAPI — usable as plain Python dataclasses.
"""

from __future__ import annotations
from typing import Literal, Union
from pydantic import BaseModel, Field


# ── Weapon keywords ───────────────────────────────────────────────────────────

class KwSimple(BaseModel):
    type: Literal[
        "TORRENT",
        "LETHAL_HITS",
        "DEVASTATING_WOUNDS",
        "TWIN_LINKED",
        "BLAST",
        "HEAVY",
        "LANCE",
        "IGNORES_COVER",
        "INDIRECT_FIRE",
        # stored but ignored by engine
        "ASSAULT", "PISTOL", "PSYCHIC", "PRECISION", "HAZARDOUS",
    ]


class KwValued(BaseModel):
    """Keyword with a dice-expression value (int string or 'D3', 'D6+1', etc.)."""
    type: Literal["SUSTAINED_HITS", "RAPID_FIRE", "MELTA", "EXTRA_ATTACKS"]
    value: str  # e.g. "1", "2", "D3"


class KwCriticalHit(BaseModel):
    type: Literal["CRITICAL_HIT_ON"]
    value: int  # threshold: 5 means 5+


class KwAnti(BaseModel):
    type: Literal["ANTI"]
    target: str   # e.g. "INFANTRY", "VEHICLE", "FLY"
    threshold: int  # e.g. 4 means critical wound on 4+


WeaponKeyword = Union[KwSimple, KwValued, KwCriticalHit, KwAnti]


# ── Buffs (external modifiers: abilities, stratagems, auras) ──────────────────

class BuffStatModifier(BaseModel):
    """Modifies a weapon or defender characteristic before rolls."""
    type: Literal[
        "ATTACKS_MODIFIER",   # +N attacks per model
        "STRENGTH_MODIFIER",  # +N strength (affects wound threshold)
        "AP_MODIFIER",        # +N to AP (negative = more penetrating)
        "DAMAGE_MODIFIER",    # +N damage per unsaved wound
        "HIT_MODIFIER",       # +N to hit roll result (capped ±1)
        "WOUND_MODIFIER",     # +N to wound roll result (capped ±1)
        "SAVE_MODIFIER",      # +N to defender save roll result (capped ±1)
    ]
    value: int


class BuffReroll(BaseModel):
    type: Literal["REROLL_HITS", "REROLL_WOUNDS", "REROLL_SAVES"]
    value: Literal["ones", "all"]


class BuffCriticalHit(BaseModel):
    type: Literal["CRITICAL_HIT_ON"]
    value: int  # lower threshold (e.g. 5 means crits on 5+)


class BuffCriticalWound(BaseModel):
    type: Literal["CRITICAL_WOUND_ON"]
    value: int


SimBuff = Union[BuffStatModifier, BuffReroll, BuffCriticalHit, BuffCriticalWound]


# ── Core request models ───────────────────────────────────────────────────────

class SimWeapon(BaseModel):
    name: str | None = None
    attacks: str            # "2", "D6", "2D3+1"
    skill: int              # hit threshold: 3 means 3+
    strength: int
    ap: int                 # 0, -1, -2, -3 ...
    damage: str             # "1", "D3", "D6+1"
    keywords: list[WeaponKeyword] = Field(default_factory=list)


class SimAttacker(BaseModel):
    models: int = Field(default=1, ge=1)
    weapon: SimWeapon
    buffs: list[SimBuff] = Field(default_factory=list)


class SimDefender(BaseModel):
    toughness: int
    save: int               # 3 means save on 3+
    invuln: int | None = None   # 4 means invuln 4+; None = no invuln
    wounds: int
    models: int = Field(default=1, ge=1)
    fnp: int | None = None      # 5 means FNP 5+; None = no FNP
    keywords: list[str] = Field(default_factory=list)  # e.g. ["INFANTRY", "CHAOS"]


class SimContext(BaseModel):
    cover: bool = False           # defender in cover (+1 armor save, not invuln)
    half_range: bool = False      # within half range (activates MELTA, RAPID FIRE)
    attacker_moved: bool = False  # attacker moved this turn (penalises HEAVY)
    attacker_charged: bool = False  # attacker charged this turn (activates LANCE)
    attacker_advanced: bool = False  # informational for ASSAULT — no engine effect
    target_visible: bool = True   # False activates INDIRECT FIRE -1 to hit


class SimRequest(BaseModel):
    attacker: SimAttacker
    defender: SimDefender
    context: SimContext = Field(default_factory=SimContext)
    n_trials: int = Field(default=1000, ge=1, le=10_000)


# ── Result models ─────────────────────────────────────────────────────────────

class SimSummary(BaseModel):
    mean_damage: float
    median_damage: float
    std_dev: float
    p10: float
    p25: float
    p75: float
    p90: float
    mean_models_killed: float


class DamageBucket(BaseModel):
    damage: int
    count: int
    probability: float


class SimResult(BaseModel):
    summary: SimSummary
    damage_histogram: list[DamageBucket]
    kill_probabilities: dict[str, float]  # {"1": 0.94, "3": 0.71, ...}
    n_trials: int
