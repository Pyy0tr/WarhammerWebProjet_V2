/**
 * engine/simulation_v11.js
 * WH40K 11e Monte Carlo simulation engine — fork of simulation.js.
 *
 * Only the confirmed V11 engine changes are applied (see V11_CHANGES.md
 * section 1 for sources). Everything else is identical to simulation.js on
 * purpose — kept as a literal copy rather than a shared module so the V10
 * engine can never regress from V11 work in progress.
 *
 * Confirmed changes applied here:
 *   - COVER: moved from a +1 save bonus (armorSv) to a -1 Hit roll malus
 *     (hitMod). IGNORES_COVER now cancels that Hit-roll malus instead of a
 *     save bonus — same keyword, same "cancels Cover" role either way.
 *   - PSYCHIC: now a real effect. Ignores negative Hit-roll modifiers
 *     (Cover, Indirect Fire, defender hit-roll debuffs) but NOT Wound roll
 *     modifiers — confirmed narrower than an earlier blog/video summary
 *     claimed. Positive modifiers (Heavy) still apply normally.
 *   - CLEAVE: new keyword, melee equivalent of Blast — same formula
 *     (+X attacks per 5 defender models, rounding down).
 *
 * NOT changed here (confirmed no math impact, see V11_CHANGES.md):
 *   - HEAVY: still +1 to hit under the same "attacker_moved" toggle. V11's
 *     official conditions (unengaged + not deployed this turn + moved ≤3")
 *     only change WHEN a player should honestly check that box — the dice
 *     math is identical, so there's nothing to change in the engine itself.
 *   - Everything else (Lethal Hits, Sustained Hits, Devastating Wounds,
 *     Twin-Linked, Torrent, Melta, Blast, Rapid Fire, Lance, Indirect Fire,
 *     Anti, FNP, invuln, damage reduction, etc.) — confirmed unchanged.
 *
 * Unconfirmed changes NOT applied here (see V11_CHANGES.md open questions):
 *   - Monsters/Vehicles reportedly losing the Cover benefit entirely — only
 *     sourced from a YouTube video, not from the community dataset's rule
 *     text. Left universal (same as V10) until confirmed.
 *   - Hazardous's fail threshold (1 vs 1-or-2) — out of engine scope anyway
 *     (self-inflicted damage isn't simulated).
 *
 * req shape identical to simulation.js:
 * {
 *   attacker: { models, weapon: { name, attacks, skill, strength, ap, damage, keywords }, buffs },
 *   defender: { toughness, save, invuln, wounds, models, fnp, keywords },
 *   context:  { cover, half_range, attacker_moved, attacker_charged, target_visible },
 *   n_trials: number
 * }
 */

import { roll, clamp, woundThreshold, d6 } from './dice.js'

// ── Keyword / buff helpers ────────────────────────────────────────────────────

function kw(keywords, type) {
  return keywords.find((k) => k.type === type) ?? null
}

function hasKw(keywords, type) {
  return keywords.some((k) => k.type === type)
}

function buf(buffs, type) {
  return buffs.find((b) => b.type === type) ?? null
}

function bufVal(buffs, type, defaultVal = 0) {
  const b = buf(buffs, type)
  return b ? b.value : defaultVal
}

// ── Single trial ──────────────────────────────────────────────────────────────

function simulateOnce(req) {
  const w   = req.attacker.weapon
  const d   = req.defender
  const ctx = req.context
  const kws = w.keywords ?? []
  const bufs = req.attacker.buffs ?? []

  // Keyword flags
  const hasSetRoll6  = hasKw(kws, 'SET_ROLL_TO_6')
  const hasTorrent   = hasKw(kws, 'TORRENT')
  const hasLethal    = hasKw(kws, 'LETHAL_HITS')
  const hasSustained = hasKw(kws, 'SUSTAINED_HITS')
  const hasDevWounds = hasKw(kws, 'DEVASTATING_WOUNDS')
  const hasBlast     = hasKw(kws, 'BLAST')
  const hasCleave    = hasKw(kws, 'CLEAVE')          // V11: melee equivalent of Blast
  const hasHeavy     = hasKw(kws, 'HEAVY')
  const hasLance     = hasKw(kws, 'LANCE')
  const hasTwin      = hasKw(kws, 'TWIN_LINKED')
  const hasRapid     = hasKw(kws, 'RAPID_FIRE')
  const hasMelta     = hasKw(kws, 'MELTA')
  const hasIgCover   = hasKw(kws, 'IGNORES_COVER')
  const hasIndirect  = hasKw(kws, 'INDIRECT_FIRE')
  const hasPsychic   = hasKw(kws, 'PSYCHIC')          // V11: ignores negative Hit modifiers
  const hasExtraAtk  = hasKw(kws, 'EXTRA_ATTACKS')
  const kwOverwatch  = kw(kws, 'FIRE_OVERWATCH')
  const hasOverwatch = kwOverwatch !== null
  const owThr        = hasOverwatch ? (parseInt(kwOverwatch.value) || 6) : 6

  const kwSustained = kw(kws, 'SUSTAINED_HITS')
  const kwRapid     = kw(kws, 'RAPID_FIRE')
  const kwMelta     = kw(kws, 'MELTA')
  const kwExtraAtk  = kw(kws, 'EXTRA_ATTACKS')
  const kwAnti      = kw(kws, 'ANTI')
  const kwCritHit   = kw(kws, 'CRITICAL_HIT_ON')

  const bufCritHit   = buf(bufs, 'CRITICAL_HIT_ON')
  const bufCritWound = buf(bufs, 'CRITICAL_WOUND_ON')

  const critHitThr   = Math.min(
    kwCritHit  ? parseInt(kwCritHit.value)  || 6 : 6,
    bufCritHit ? parseInt(bufCritHit.value) || 6 : 6,
  )
  const critWoundThr = bufCritWound ? bufCritWound.value : 6

  // Stat modifiers
  const atkMod   = bufVal(bufs, 'ATTACKS_MODIFIER')
  const strMod   = bufVal(bufs, 'STRENGTH_MODIFIER')
  const apMod    = bufVal(bufs, 'AP_MODIFIER')
  const dmgMod   = bufVal(bufs, 'DAMAGE_MODIFIER')
  let   woundMod = bufVal(bufs, 'WOUND_MODIFIER')     // Psychic does NOT touch this — confirmed Hit-only
  const saveMod  = bufVal(bufs, 'SAVE_MODIFIER')

  const rerollHits   = buf(bufs, 'REROLL_HITS')
  const rerollWounds = buf(bufs, 'REROLL_WOUNDS')
  const rerollSaves  = buf(bufs, 'REROLL_SAVES')

  const effStrength = w.strength + strMod
  const effAp       = w.ap + apMod

  // ── Context modifiers (Hit roll) ─────────────────────────────────────────────
  // V11: Cover is now a Hit-roll malus (was a Save bonus in V10). Psychic
  // ignores any negative Hit-roll modifier but keeps positive ones (Heavy).
  const buffHitMod = bufVal(bufs, 'HIT_MODIFIER')
  let hitBonus = buffHitMod > 0 ? buffHitMod : 0
  let hitMalus = buffHitMod < 0 ? buffHitMod : 0

  if (hasHeavy && !ctx.attacker_moved)     hitBonus += 1
  if (hasIndirect && !ctx.target_visible)  hitMalus -= 1
  if (ctx.cover && !hasIgCover)            hitMalus -= 1   // V11: cover malus, not a save bonus
  if (d.debuff_hit_roll)                   hitMalus -= 1   // defender ability: -1 to attacker hit rolls

  let hitMod = hasPsychic ? hitBonus : hitBonus + hitMalus

  if (hasLance && ctx.attacker_charged)  woundMod += 1

  hitMod   = clamp(hitMod,   -1, 1)
  woundMod = clamp(woundMod, -1, 1)

  // ── Pré-calcul wound threshold (utilisé phase 3 et décision SET_ROLL_TO_6) ──

  const wThr = woundThreshold(effStrength, d.toughness)

  // ── SET_ROLL_TO_6: décision optimale avant les jets ───────────────────────────
  // Compare E[gain hit use] vs E[gain wound use] (eD s'annule des deux côtés).
  //
  // Wound use : un wound roll à 6 (blessure garantie, toujours crit wound)
  //   E = DevWounds ? 1 : pSaveFail
  //
  // Hit use : un crit hit (die=6) → wound phase
  //   Sans LETHAL  : pWound × pSaveFail
  //   Avec LETHAL  : pSaveFail            (auto-wound = même que wound use sans DevWounds)
  //   Avec SUSTAINED X : + E[X] × pHit × (hasLethal ? pSaveFail : pWound × pSaveFail)
  //     → hit devient supérieur quand les hits bonus du Sustained compensent
  //
  // Règle : wound use est toujours ≥ sauf si SUSTAINED_HITS actif avec suffisamment de pHit
  //
  // V11: cover n'affecte plus la sauvegarde (armorSv) — ce pré-calcul ne
  // soustrait donc plus 1 pour ctx.cover ici (contrairement à simulation.js).

  let set6UseOn = 'wound'
  if (hasSetRoll6) {
    const pWoundPre  = Math.max(0, (7 - wThr) / 6)
    let   arSvPre    = Math.max(d.save - effAp, 2)
    const effSvPre   = Math.min(d.invuln != null ? Math.min(arSvPre, d.invuln) : arSvPre, 7) + saveMod
    const pFailPre   = Math.max(0, Math.min(1, (effSvPre - 1) / 6))

    const eWound = hasDevWounds ? 1 : pFailPre

    let eHit = hasLethal ? pFailPre : pWoundPre * pFailPre
    if (hasSustained) {
      const pHit = Math.max(0, (7 - clamp(w.skill, 2, 6)) / 6)
      const sv   = kwSustained.value
      const eSus = sv === 'D6' ? 3.5 : sv === 'D3' ? 2 : (parseFloat(sv) || 1)
      eHit += eSus * pHit * (hasLethal ? pFailPre : pWoundPre * pFailPre)
    }

    if (eHit >= eWound) set6UseOn = 'hit'
  }

  // ── Phase 1: attacks ─────────────────────────────────────────────────────────

  const basePerModel  = Math.max(1, roll(w.attacks) + atkMod)
  const extraPerModel = hasExtraAtk ? roll(kwExtraAtk.value) : 0
  const blastBonus    = hasBlast ? Math.floor(d.models / 5) : 0
  const cleaveBonus   = hasCleave ? Math.floor(d.models / 5) : 0   // V11: melee Blast equivalent

  let numAttacks = req.attacker.models * (basePerModel + extraPerModel + blastBonus + cleaveBonus)

  if (hasRapid && ctx.half_range) {
    numAttacks += roll(kwRapid.value) * req.attacker.models
  }

  // ── Phase 2: hit rolls ───────────────────────────────────────────────────────

  let autoWounds = 0
  let hits = 0

  if (hasTorrent) {
    hits = numAttacks
  } else {
    const skill = clamp(w.skill, 2, 6)

    function rollHit() {
      let die = d6()
      if (rerollHits) {
        const eligible = hasOverwatch
          ? (rerollHits.value === 'ones' && die === 1) ||
            (rerollHits.value === 'all'  && die < owThr)
          : (rerollHits.value === 'ones' && die === 1) ||
            (rerollHits.value === 'all'  && (die === 1 || clamp(die + hitMod, 1, 6) < skill) && die < critHitThr)
        if (eligible) die = d6()
      }
      return die
    }

    // resolveHit: evaluate one hit die. sustainedDepth>0 = generated by Sustained Hits
    // (can trigger Lethal Hits on crit, but NOT more Sustained Hits — no cascade)
    function resolveHit(die, sustainedDepth) {
      if (die === 1) return

      const isCrit  = die >= critHitThr
      // Overwatch: only an unmodified roll >= owThr (5 or 6) scores a hit — BS and modifiers ignored
      const success = hasOverwatch
        ? die >= owThr
        : isCrit || clamp(die + hitMod, 1, 6) >= skill
      if (!success) return

      hits++

      if (isCrit) {
        // Lethal Hits: critical hit auto-wounds (no wound roll needed)
        if (hasLethal) autoWounds += 1

        // Sustained Hits: X additional hit rolls at same BS — only from original attacks
        // Extra dice benefit from re-rolls (BUG-003), but do NOT chain into more Sustained Hits
        if (hasSustained && sustainedDepth === 0) {
          const extra = roll(kwSustained.value)
          for (let j = 0; j < extra; j++) {
            resolveHit(rollHit(), 1)  // depth=1 prevents further Sustained Hits cascade
          }
        }
      }
    }

    for (let i = 0; i < numAttacks; i++) {
      resolveHit(rollHit(), 0)
    }

    // SET_ROLL_TO_6 sur hit roll : injecte un crit hit (die=6) supplémentaire
    if (hasSetRoll6 && set6UseOn === 'hit') resolveHit(6, 0)
  }

  // ── Phase 3: wound rolls ─────────────────────────────────────────────────────

  const hitsToRoll = Math.max(0, hits - autoWounds)

  let woundsNormal = 0
  let mortalWounds = 0

  const canRerollWound = hasTwin || rerollWounds !== null

  function rerollWoundEligible(die) {
    if (hasTwin) return true
    if (rerollWounds) {
      return (rerollWounds.value === 'ones' && die === 1) || rerollWounds.value === 'all'
    }
    return false
  }

  function evaluateWound(dVal) {
    if (dVal === 1) return { success: false, isCrit: false }
    let isCrit = dVal >= critWoundThr
    if (kwAnti && dVal >= kwAnti.threshold) {
      const defKws = (d.keywords ?? []).map((k) => k.toUpperCase())
      if (defKws.includes(kwAnti.target.toUpperCase())) isCrit = true
    }
    const modified = clamp(dVal + woundMod, 1, 6)
    const success  = isCrit || modified >= wThr
    return { success, isCrit }
  }

  for (let i = 0; i < hitsToRoll; i++) {
    let die = d6()
    let { success, isCrit } = evaluateWound(die)

    if (!success && canRerollWound && rerollWoundEligible(die)) {
      die = d6()
      ;({ success, isCrit } = evaluateWound(die))
    }

    if (!success) continue

    if (isCrit && hasDevWounds) {
      mortalWounds++
    } else {
      woundsNormal++
    }
  }

  // SET_ROLL_TO_6 sur wound roll : injecte un wound roll à 6 (blessure garantie, crit wound)
  if (hasSetRoll6 && set6UseOn === 'wound') {
    const { success, isCrit } = evaluateWound(6)
    if (success) {
      if (isCrit && hasDevWounds) mortalWounds++
      else woundsNormal++
    }
  }

  const woundsNeedingSave = woundsNormal + autoWounds

  // ── Phase 4: save rolls ──────────────────────────────────────────────────────
  // V11: cover no longer touches the save (see Hit-roll modifiers above).

  // AP is stored as 0, -1, -2 etc. save worsens by |AP|
  // save=3, ap=-2 → armor_sv = 3 - (-2) = 5+ (worse)
  let armorSv = d.save - effAp

  armorSv = Math.max(armorSv, 2)

  let effSave = d.invuln != null ? Math.min(armorSv, d.invuln) : armorSv
  effSave = Math.min(effSave, 7)
  effSave += saveMod

  let failedSaves = 0

  for (let i = 0; i < woundsNeedingSave; i++) {
    let die = d6()

    if (rerollSaves) {
      const eligible =
        (rerollSaves.value === 'ones' && die === 1) ||
        (rerollSaves.value === 'all'  && die < effSave)
      if (eligible) die = d6()
    }

    if (die < effSave) failedSaves++
  }

  const totalUnsaved = failedSaves + mortalWounds

  // ── Phase 5: damage + FNP ────────────────────────────────────────────────────

  let totalDamage = 0
  let modelWoundsLeft = d.wounds
  let modelsLeft      = d.models ?? 1

  for (let i = 0; i < totalUnsaved; i++) {
    if (modelsLeft <= 0) break

    let dmg = roll(w.damage) + dmgMod
    if (hasMelta && ctx.half_range) dmg += roll(kwMelta.value)
    dmg = Math.max(0, dmg)

    // Damage reduction (defender ability: -N to damage, min 1)
    if (d.dmg_reduction) dmg = Math.max(1, dmg - 1)

    // FNP: one roll per damage point
    let effectiveDmg = 0
    if (d.fnp != null) {
      for (let j = 0; j < dmg; j++) {
        if (d6() < d.fnp) effectiveDmg++  // fails FNP → damage lands
      }
    } else {
      effectiveDmg = dmg
    }

    // Cap at current model's remaining wounds — overkill is lost (BUG-002)
    const dealt = Math.min(effectiveDmg, modelWoundsLeft)
    totalDamage      += dealt
    modelWoundsLeft  -= dealt

    if (modelWoundsLeft <= 0) {
      modelsLeft--
      modelWoundsLeft = d.wounds
    }
  }

  return { damage: totalDamage, phaseAttacks: numAttacks, phaseHits: hits, phaseWounds: woundsNormal + mortalWounds + autoWounds, phaseUnsaved: totalUnsaved }
}

// ── Aggregation ───────────────────────────────────────────────────────────────

export function simulate(req) {
  const n = req.n_trials ?? 1000

  // Support multi-attack: req.attacks[] array OR legacy single req.attacker
  const attackList = req.attacks ?? [req.attacker ?? { models: req.attacker?.models ?? 1, weapon: req.attacker?.weapon, buffs: req.attacker?.buffs ?? [] }]

  const trials = []
  let sumA = 0, sumH = 0, sumW = 0, sumU = 0
  for (let i = 0; i < n; i++) {
    let totalDmg = 0
    let trialA = 0, trialH = 0, trialW = 0, trialU = 0
    for (const atk of attackList) {
      const r = simulateOnce({
        attacker: { models: atk.models, weapon: atk.weapon, buffs: atk.buffs ?? [] },
        defender: req.defender,
        context:  req.context,
      })
      totalDmg += r.damage
      trialA   += r.phaseAttacks
      trialH   += r.phaseHits
      trialW   += r.phaseWounds
      trialU   += r.phaseUnsaved
    }
    trials.push(totalDmg)
    sumA += trialA; sumH += trialH; sumW += trialW; sumU += trialU
  }

  const sorted = [...trials].sort((a, b) => a - b)
  const mean   = trials.reduce((s, v) => s + v, 0) / n
  const median = sorted[Math.floor(n / 2)]
  const std    = Math.sqrt(trials.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(n - 1, 1))

  function pct(p) {
    const idx = Math.floor((p / 100) * n)
    return sorted[Math.min(idx, n - 1)]
  }

  // Histogram
  const counter = {}
  for (const v of trials) counter[v] = (counter[v] ?? 0) + 1
  const maxDmg = trials.length ? Math.max(...trials) : 0
  const histogram = []
  for (let dmg = 0; dmg <= maxDmg; dmg++) {
    const count = counter[dmg] ?? 0
    histogram.push({ damage: dmg, count, probability: round4(count / n) })
  }

  // Kill probabilities
  const woundsPerModel = req.defender.wounds
  const killProbs = {}
  for (let k = 1; k <= req.defender.models; k++) {
    const threshold = k * woundsPerModel
    killProbs[String(k)] = round4(trials.filter((t) => t >= threshold).length / n)
  }

  return {
    summary: {
      mean_damage:        round2(mean),
      median_damage:      round2(median),
      std_dev:            round2(std),
      p10:                pct(10),
      p25:                pct(25),
      p75:                pct(75),
      p90:                pct(90),
      mean_models_killed: round2(woundsPerModel > 0 ? mean / woundsPerModel : 0),
    },
    damage_histogram:   histogram,
    kill_probabilities: killProbs,
    phase_funnel: {
      attacks: round2(sumA / n),
      hits:    round2(sumH / n),
      wounds:  round2(sumW / n),
      unsaved: round2(sumU / n),
      damage:  round2(mean),
    },
    n_trials: n,
  }
}

function round2(v) { return Math.round(v * 100) / 100 }
function round4(v) { return Math.round(v * 10000) / 10000 }
