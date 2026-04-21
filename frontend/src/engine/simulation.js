/**
 * engine/simulation.js
 * WH40K 10e Monte Carlo simulation engine — port of backend/engine/simulation.py
 *
 * Entry point: simulate(req) -> SimResult
 *
 * req shape:
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
  const hasTorrent   = hasKw(kws, 'TORRENT')
  const hasLethal    = hasKw(kws, 'LETHAL_HITS')
  const hasSustained = hasKw(kws, 'SUSTAINED_HITS')
  const hasDevWounds = hasKw(kws, 'DEVASTATING_WOUNDS')
  const hasBlast     = hasKw(kws, 'BLAST')
  const hasHeavy     = hasKw(kws, 'HEAVY')
  const hasLance     = hasKw(kws, 'LANCE')
  const hasTwin      = hasKw(kws, 'TWIN_LINKED')
  const hasRapid     = hasKw(kws, 'RAPID_FIRE')
  const hasMelta     = hasKw(kws, 'MELTA')
  const hasIgCover   = hasKw(kws, 'IGNORES_COVER')
  const hasIndirect  = hasKw(kws, 'INDIRECT_FIRE')
  const hasExtraAtk  = hasKw(kws, 'EXTRA_ATTACKS')

  const kwSustained = kw(kws, 'SUSTAINED_HITS')
  const kwRapid     = kw(kws, 'RAPID_FIRE')
  const kwMelta     = kw(kws, 'MELTA')
  const kwExtraAtk  = kw(kws, 'EXTRA_ATTACKS')
  const kwAnti      = kw(kws, 'ANTI')
  const kwCritHit   = kw(kws, 'CRITICAL_HIT_ON')

  const bufCritHit   = buf(bufs, 'CRITICAL_HIT_ON')
  const bufCritWound = buf(bufs, 'CRITICAL_WOUND_ON')

  const critHitThr   = Math.min(
    kwCritHit  ? kwCritHit.value  : 6,
    bufCritHit ? bufCritHit.value : 6,
  )
  const critWoundThr = bufCritWound ? bufCritWound.value : 6

  // Stat modifiers
  const atkMod   = bufVal(bufs, 'ATTACKS_MODIFIER')
  const strMod   = bufVal(bufs, 'STRENGTH_MODIFIER')
  const apMod    = bufVal(bufs, 'AP_MODIFIER')
  const dmgMod   = bufVal(bufs, 'DAMAGE_MODIFIER')
  let   hitMod   = bufVal(bufs, 'HIT_MODIFIER')
  let   woundMod = bufVal(bufs, 'WOUND_MODIFIER')
  const saveMod  = bufVal(bufs, 'SAVE_MODIFIER')

  const rerollHits   = buf(bufs, 'REROLL_HITS')
  const rerollWounds = buf(bufs, 'REROLL_WOUNDS')
  const rerollSaves  = buf(bufs, 'REROLL_SAVES')

  const effStrength = w.strength + strMod
  const effAp       = w.ap + apMod

  // Context modifiers
  if (hasHeavy && !ctx.attacker_moved)  hitMod += 1
  if (hasLance && ctx.attacker_charged) woundMod += 1
  if (hasIndirect && !ctx.target_visible) hitMod -= 1

  hitMod   = clamp(hitMod,   -1, 1)
  woundMod = clamp(woundMod, -1, 1)

  // ── Phase 1: attacks ─────────────────────────────────────────────────────────

  const basePerModel  = Math.max(1, roll(w.attacks) + atkMod)
  const extraPerModel = hasExtraAtk ? roll(kwExtraAtk.value) : 0
  const blastBonus    = hasBlast ? Math.floor(d.models / 5) : 0

  let numAttacks = req.attacker.models * (basePerModel + extraPerModel) + blastBonus

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

    for (let i = 0; i < numAttacks; i++) {
      let die = d6()

      if (rerollHits) {
        const eligible =
          (rerollHits.value === 'ones' && die === 1) ||
          (rerollHits.value === 'all'  && clamp(die + hitMod, 1, 6) < skill && die < critHitThr)
        if (eligible) die = d6()
      }

      if (die === 1) continue

      const isCrit   = die >= critHitThr
      const modified = clamp(die + hitMod, 1, 6)
      const success  = isCrit || modified >= skill

      if (!success) continue

      hits++

      if (isCrit) {
        if (hasLethal)    autoWounds += 1
        if (hasSustained) hits += roll(kwSustained.value)
      }
    }
  }

  // ── Phase 3: wound rolls ─────────────────────────────────────────────────────

  const wThr = woundThreshold(effStrength, d.toughness)
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

  const woundsNeedingSave = woundsNormal + autoWounds

  // ── Phase 4: save rolls ──────────────────────────────────────────────────────

  // AP is stored as 0, -1, -2 etc. save worsens by |AP|
  // save=3, ap=-2 → armor_sv = 3 - (-2) = 5+ (worse)
  let armorSv = d.save - effAp

  if (ctx.cover && !hasIgCover) armorSv -= 1  // cover improves by 1

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

  for (let i = 0; i < totalUnsaved; i++) {
    let dmg = roll(w.damage) + dmgMod

    if (hasMelta && ctx.half_range) dmg += roll(kwMelta.value)

    dmg = Math.max(0, dmg)

    if (d.fnp != null) {
      for (let j = 0; j < dmg; j++) {
        if (d6() < d.fnp) totalDamage++  // fails FNP → damage lands
      }
    } else {
      totalDamage += dmg
    }
  }

  return totalDamage
}

// ── Aggregation ───────────────────────────────────────────────────────────────

export function simulate(req) {
  const n = req.n_trials ?? 1000
  const trials = []
  for (let i = 0; i < n; i++) trials.push(simulateOnce(req))

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
    n_trials:           n,
  }
}

function round2(v) { return Math.round(v * 100) / 100 }
function round4(v) { return Math.round(v * 10000) / 10000 }
