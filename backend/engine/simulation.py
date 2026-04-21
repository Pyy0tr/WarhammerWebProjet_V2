"""
engine/simulation.py
--------------------
WH40K 10e Monte Carlo simulation engine.
Pure Python — no FastAPI, no database, no I/O.

Entry point: simulate(req: SimRequest) -> SimResult
"""

import math
import random
import statistics
from collections import Counter

from .dice import clamp, roll, wound_threshold
from .schemas import (
    SimAttacker, SimBuff, SimContext, SimDefender, SimRequest, SimResult,
    SimSummary, DamageBucket, WeaponKeyword,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _kw(keywords: list[WeaponKeyword], kw_type: str):
    """Return first keyword of given type, or None."""
    for k in keywords:
        if k.type == kw_type:
            return k
    return None


def _has_kw(keywords: list[WeaponKeyword], kw_type: str) -> bool:
    return any(k.type == kw_type for k in keywords)


def _buf(buffs: list[SimBuff], buf_type: str):
    """Return first buff of given type, or None."""
    for b in buffs:
        if b.type == buf_type:
            return b
    return None


def _buf_val(buffs: list[SimBuff], buf_type: str, default: int = 0) -> int:
    b = _buf(buffs, buf_type)
    return b.value if b else default


# ── Single trial ──────────────────────────────────────────────────────────────

def _simulate_once(req: SimRequest) -> int:
    """Run one Monte Carlo trial. Returns total damage dealt to the defender."""

    w    = req.attacker.weapon
    d    = req.defender
    ctx  = req.context
    kws  = w.keywords
    bufs = req.attacker.buffs

    # -- Keyword presence flags --
    has_torrent    = _has_kw(kws, "TORRENT")
    has_lethal     = _has_kw(kws, "LETHAL_HITS")
    has_sustained  = _has_kw(kws, "SUSTAINED_HITS")
    has_devwounds  = _has_kw(kws, "DEVASTATING_WOUNDS")
    has_blast      = _has_kw(kws, "BLAST")
    has_heavy      = _has_kw(kws, "HEAVY")
    has_lance      = _has_kw(kws, "LANCE")
    has_twin       = _has_kw(kws, "TWIN_LINKED")
    has_rapid      = _has_kw(kws, "RAPID_FIRE")
    has_melta      = _has_kw(kws, "MELTA")
    has_igcover    = _has_kw(kws, "IGNORES_COVER")
    has_indirect   = _has_kw(kws, "INDIRECT_FIRE")
    has_extra_atk  = _has_kw(kws, "EXTRA_ATTACKS")

    kw_sustained  = _kw(kws, "SUSTAINED_HITS")
    kw_rapid      = _kw(kws, "RAPID_FIRE")
    kw_melta      = _kw(kws, "MELTA")
    kw_extra_atk  = _kw(kws, "EXTRA_ATTACKS")
    kw_anti       = _kw(kws, "ANTI")
    kw_crit_hit   = _kw(kws, "CRITICAL_HIT_ON")

    # -- Critical thresholds (take the most aggressive: lowest value) --
    buf_crit_hit   = _buf(bufs, "CRITICAL_HIT_ON")
    buf_crit_wound = _buf(bufs, "CRITICAL_WOUND_ON")

    crit_hit_thr = min(
        kw_crit_hit.value   if kw_crit_hit   else 6,
        buf_crit_hit.value  if buf_crit_hit  else 6,
    )
    crit_wound_thr = buf_crit_wound.value if buf_crit_wound else 6

    # -- Stat modifiers --
    atk_mod   = _buf_val(bufs, "ATTACKS_MODIFIER")
    str_mod   = _buf_val(bufs, "STRENGTH_MODIFIER")
    ap_mod    = _buf_val(bufs, "AP_MODIFIER")
    dmg_mod   = _buf_val(bufs, "DAMAGE_MODIFIER")
    hit_mod   = _buf_val(bufs, "HIT_MODIFIER")
    wound_mod = _buf_val(bufs, "WOUND_MODIFIER")
    save_mod  = _buf_val(bufs, "SAVE_MODIFIER")

    reroll_hits   = _buf(bufs, "REROLL_HITS")
    reroll_wounds = _buf(bufs, "REROLL_WOUNDS")
    reroll_saves  = _buf(bufs, "REROLL_SAVES")

    # -- Effective weapon stats --
    eff_strength = w.strength + str_mod
    eff_ap       = w.ap + ap_mod

    # Context-driven modifiers
    if has_heavy and not ctx.attacker_moved:
        hit_mod += 1
    if has_lance and ctx.attacker_charged:
        wound_mod += 1
    if has_indirect and not ctx.target_visible:
        hit_mod -= 1

    # WH40K 10e: roll modifiers are capped at ±1
    hit_mod   = clamp(hit_mod,   -1, 1)
    wound_mod = clamp(wound_mod, -1, 1)

    # ── Phase 1: number of attacks ────────────────────────────────────────────

    # Base attacks per model (affected by ATTACKS_MODIFIER)
    base_per_model = max(1, roll(w.attacks) + atk_mod)

    # EXTRA_ATTACKS: bonus attacks not affected by ATTACKS_MODIFIER
    extra_per_model = roll(kw_extra_atk.value) if has_extra_atk else 0

    # BLAST: +floor(N/5) attacks where N = defender models
    blast_bonus = math.floor(d.models / 5) if has_blast else 0

    num_attacks = req.attacker.models * (base_per_model + extra_per_model) + blast_bonus

    # RAPID FIRE: +value attacks per model if within half range
    if has_rapid and ctx.half_range:
        num_attacks += roll(kw_rapid.value) * req.attacker.models

    # ── Phase 2: hit rolls ────────────────────────────────────────────────────

    auto_wounds = 0   # LETHAL_HITS crits — skip wound roll, still need save
    hits = 0

    if has_torrent:
        hits = num_attacks
        # TORRENT has no actual dice rolls — no crits, no LETHAL/SUSTAINED triggers
    else:
        skill = clamp(w.skill, 2, 6)

        for _ in range(num_attacks):
            die = random.randint(1, 6)

            # Reroll before evaluation (natural die decides eligibility)
            if reroll_hits:
                eligible = (
                    (reroll_hits.value == "ones" and die == 1) or
                    (reroll_hits.value == "all"  and clamp(die + hit_mod, 1, 6) < skill and not (die >= crit_hit_thr))
                )
                if eligible:
                    die = random.randint(1, 6)

            if die == 1:
                continue  # natural 1 always fails, even after reroll

            is_crit = die >= crit_hit_thr
            modified = clamp(die + hit_mod, 1, 6)
            success = is_crit or (modified >= skill)

            if not success:
                continue

            hits += 1

            if is_crit:
                if has_lethal:
                    auto_wounds += 1       # wound is automatic — save still required
                if has_sustained:
                    hits += roll(kw_sustained.value)  # bonus hits, not critical

    # ── Phase 3: wound rolls ──────────────────────────────────────────────────

    w_thr = wound_threshold(eff_strength, d.toughness)

    # Hits that need a wound roll = total hits minus LETHAL auto-wounds
    hits_to_roll = max(0, hits - auto_wounds)

    wounds_normal  = 0  # need a save roll
    mortal_wounds  = 0  # DEVASTATING_WOUNDS: bypass all saves

    # Whether a reroll is available for wounds (TWIN_LINKED or buff — only one)
    can_reroll_wound = has_twin or (reroll_wounds is not None)

    def _reroll_wound_eligible(die: int, value: str | None) -> bool:
        """True if the die qualifies for reroll under the active rule."""
        if has_twin:
            # TWIN_LINKED re-rolls all failed wounds
            return True
        if reroll_wounds:
            return (
                (reroll_wounds.value == "ones" and die == 1) or
                reroll_wounds.value == "all"
            )
        return False

    for _ in range(hits_to_roll):
        die = random.randint(1, 6)

        def _evaluate_wound(d_val: int):
            is_crit = d_val >= crit_wound_thr
            # ANTI keyword: critical wound on X+ vs matching keyword
            if kw_anti and d_val >= kw_anti.threshold:
                if kw_anti.target.upper() in (k.upper() for k in d.keywords):
                    is_crit = True
            if d_val == 1:
                return False, False
            modified = clamp(d_val + wound_mod, 1, 6)
            success = is_crit or (modified >= w_thr)
            return success, is_crit

        success, is_crit = _evaluate_wound(die)

        # One reroll if eligible and failed
        if not success and can_reroll_wound and _reroll_wound_eligible(die, None):
            die = random.randint(1, 6)
            success, is_crit = _evaluate_wound(die)

        if not success:
            continue

        if is_crit and has_devwounds:
            mortal_wounds += 1   # bypasses armor save AND invuln
        else:
            wounds_normal += 1

    # Wounds needing a save = normal wounds + LETHAL auto-wounds
    wounds_needing_save = wounds_normal + auto_wounds

    # ── Phase 4: save rolls ───────────────────────────────────────────────────

    # Armor save degraded by AP (lower number = easier to save, but AP is negative)
    # effective_ap is <= 0, so: armor_sv = save + effective_ap (better save)
    # Example: save=3, ap=-2 → armor_sv = 3 + (-2) = 1... wait that's wrong
    # Actually: AP -2 means the save is WORSE by 2. save=3+, with AP-2 → save on 5+
    # So: armor_sv = save - ap (ap is stored as negative, so -(-2) = +2 → 3+2=5)
    armor_sv = d.save - eff_ap   # eff_ap is 0, -1, -2 etc. → -(-2) = +2

    # Cover gives +1 to armor save (makes it 1 easier = lower threshold)
    if ctx.cover and not has_igcover:
        armor_sv -= 1   # 5+ becomes 4+ (lower number = better save)

    armor_sv = max(armor_sv, 2)   # 2+ is the best possible armor save

    # Use best available save (armor or invuln — lower = better)
    if d.invuln is not None:
        eff_save = min(armor_sv, d.invuln)
    else:
        eff_save = armor_sv

    # 7+ is impossible (all dice show 1-6)
    eff_save = min(eff_save, 7)

    # Save modifier (from defender buff) — positive = harder to save
    eff_save += save_mod

    failed_saves = 0
    for _ in range(wounds_needing_save):
        die = random.randint(1, 6)

        if reroll_saves:
            eligible = (
                (reroll_saves.value == "ones" and die == 1) or
                (reroll_saves.value == "all"  and die < eff_save)
            )
            if eligible:
                die = random.randint(1, 6)

        if die < eff_save:
            failed_saves += 1

    # DEVASTATING_WOUNDS bypass all saves (mortal wounds)
    total_unsaved = failed_saves + mortal_wounds

    # ── Phase 5: damage + FNP ────────────────────────────────────────────────

    total_damage = 0

    for _ in range(total_unsaved):
        dmg = roll(w.damage) + dmg_mod

        # MELTA bonus if within half range
        if has_melta and ctx.half_range:
            dmg += roll(kw_melta.value)

        dmg = max(0, dmg)

        # Feel No Pain: roll per damage point — save on fnp+
        if d.fnp is not None:
            for _ in range(dmg):
                if random.randint(1, 6) < d.fnp:   # fails FNP → damage lands
                    total_damage += 1
        else:
            total_damage += dmg

    return total_damage


# ── Aggregation ───────────────────────────────────────────────────────────────

def simulate(req: SimRequest) -> SimResult:
    """Run n_trials simulations and return aggregated results."""

    trials = [_simulate_once(req) for _ in range(req.n_trials)]
    n = len(trials)
    sorted_t = sorted(trials)
    counter = Counter(trials)

    mean_dmg   = statistics.mean(trials)
    median_dmg = float(statistics.median(trials))
    std_dev    = statistics.stdev(trials) if n > 1 else 0.0

    def pct(p: float) -> float:
        idx = int(p / 100 * n)
        return float(sorted_t[min(idx, n - 1)])

    wounds_per_model = req.defender.wounds
    mean_killed = mean_dmg / wounds_per_model if wounds_per_model > 0 else 0.0

    max_dmg = max(trials) if trials else 0
    histogram = [
        DamageBucket(
            damage=dmg,
            count=counter.get(dmg, 0),
            probability=round(counter.get(dmg, 0) / n, 4),
        )
        for dmg in range(0, max_dmg + 1)
    ]

    # P(kills >= k models) for k in 1..defender.models
    kill_probs: dict[str, float] = {}
    for k in range(1, req.defender.models + 1):
        threshold = k * wounds_per_model
        prob = sum(1 for t in trials if t >= threshold) / n
        kill_probs[str(k)] = round(prob, 4)

    return SimResult(
        summary=SimSummary(
            mean_damage=round(mean_dmg, 2),
            median_damage=round(median_dmg, 2),
            std_dev=round(std_dev, 2),
            p10=pct(10),
            p25=pct(25),
            p75=pct(75),
            p90=pct(90),
            mean_models_killed=round(mean_killed, 2),
        ),
        damage_histogram=histogram,
        kill_probabilities=kill_probs,
        n_trials=n,
    )
