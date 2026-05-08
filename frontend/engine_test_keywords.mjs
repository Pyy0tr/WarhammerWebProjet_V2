/**
 * engine_test_keywords.mjs — WH40K 10e weapon keyword & attacker ability regression tests
 * ──────────────────────────────────────────────────────────────────────────────────────────
 * Usage:   node frontend/engine_test_keywords.mjs
 * Exit:    0 if all pass, 1 if any fail
 *
 * PURPOSE
 * -------
 * Each test validates one weapon keyword or attacker ability in isolation.
 * A closed-form theory value is derived and compared to the Monte Carlo mean
 * from simulate(). This makes it easy to verify new keywords as they are
 * added to the engine, or catch regressions when existing ones are edited.
 *
 * GLOBAL SETTINGS
 * ───────────────
 *   N   — Monte Carlo trials per test  (higher = more accurate but slower)
 *   TOL — relative tolerance for PASS/FAIL  (0.15 = ±15 %)
 *
 * THEORY HELPERS
 * ──────────────
 *   woundOn(S, T)          → minimum die roll needed to wound (2–6)
 *   pGe(t)                 → P(1d6 ≥ t)
 *   pSaveFail(sv,ap,inv,c) → P(armour save fails), mirrors engine logic
 *   expectedRoll(expr)     → expected value of a dice expression
 *                            supports: '1', 'D3', 'D6', 'D6+2', '2D6', '2D6+1', …
 *
 * OUTPUT FORMAT
 * ─────────────
 *   ✓ PASS  <name>   theory=X.XXX  sim=Y.YYY  err=Z.Z%
 *   ✗ FAIL  <name>   theory=X.XXX  sim=Y.YYY  err=Z.Z%
 *
 * HOW TO TEST A NEW KEYWORD
 * ─────────────────────────
 * 1. Copy a nearby ;(()=>{ ... })() block and place it before the summary.
 * 2. Add the keyword object to the weapon's keywords array in mkReq().
 * 3. Derive the theory from the phase formula comments in engine/simulation.js.
 * 4. Run the script — all previous tests will re-run as a regression check.
 *
 * HOW TO MODIFY AN EXISTING TEST
 * ───────────────────────────────
 * Each block opens with a CONFIG section of named constants.
 * Edit those constants only — the formula and the simulate() call
 * update automatically from them. Do NOT edit the formula lines directly.
 *
 * STRUCTURE
 * ─────────
 *   Section A — Weapon keywords  (TORRENT, SUSTAINED_HITS, HEAVY, LANCE,
 *                                  MELTA, ANTI, IGNORES_COVER)
 *   Section B — Attacker abilities / buffs  (REROLL_HITS all, HIT_MODIFIER,
 *                                            WOUND_MODIFIER)
 *
 * BUFF FORMAT REFERENCE  (passed as the buffs[] array in mkReq)
 * ─────────────────────────────────────────────────────────────
 *   { type: 'REROLL_HITS',     value: 'all' | 'ones' }
 *   { type: 'REROLL_WOUNDS',   value: 'all' | 'ones' }
 *   { type: 'REROLL_SAVES',    value: 'all' | 'ones' }
 *   { type: 'HIT_MODIFIER',    value: 1 | -1 }
 *   { type: 'WOUND_MODIFIER',  value: 1 | -1 }
 *   { type: 'SAVE_MODIFIER',   value: 1 | -1 }
 *   { type: 'ATTACKS_MODIFIER',value: number }
 *   { type: 'STRENGTH_MODIFIER',value: number }
 *   { type: 'AP_MODIFIER',     value: number }
 *   { type: 'DAMAGE_MODIFIER', value: number }
 *   { type: 'CRITICAL_HIT_ON', value: 5 }   ← crit on 5+
 *   { type: 'CRITICAL_WOUND_ON',value: 5 }
 */

import { simulate } from './src/engine/simulation.js'

// ── Global settings ───────────────────────────────────────────────────────────

const N   = 10_000   // Monte Carlo trials per test
const TOL = 0.15     // relative tolerance  (0.15 = ±15 %)

// ── Theory helpers ────────────────────────────────────────────────────────────

function woundOn(S, T) {
  if (S >= T * 2) return 2
  if (S > T)      return 3
  if (S === T)    return 4
  if (S * 2 > T)  return 5
  return 6
}

// P(1d6 >= threshold)
function pGe(t) { return Math.max(0, Math.min(1, (7 - t) / 6)) }

// P(save fails) — mirrors engine logic exactly
function pSaveFail(save, ap, invuln = null, cover = false) {
  let armor = save - ap
  if (cover) armor -= 1
  armor = Math.max(armor, 2)
  const eff  = invuln != null ? Math.min(armor, invuln) : armor
  const effC = Math.min(eff, 7)
  return Math.max(0, (effC - 1) / 6)
}

/**
 * Expected value of a dice expression — supports all formats from dice.js:
 *   '1', '3'           → flat integer
 *   'D3', 'D6'         → (1 + faces) / 2
 *   'D6+2'             → (1 + faces) / 2 + bonus
 *   '2D6'              → n × (1 + faces) / 2
 *   '2D6+1'            → n × (1 + faces) / 2 + bonus
 */
function expectedRoll(expr) {
  const s = String(expr).toUpperCase().trim()
  let m
  if (/^\d+$/.test(s))               return parseInt(s, 10)
  m = s.match(/^D(\d+)$/)
  if (m)                             return (1 + parseInt(m[1])) / 2
  m = s.match(/^D(\d+)\+(\d+)$/)
  if (m)                             return (1 + parseInt(m[1])) / 2 + parseInt(m[2])
  m = s.match(/^(\d+)D(\d+)$/)
  if (m)                             return parseInt(m[1]) * (1 + parseInt(m[2])) / 2
  m = s.match(/^(\d+)D(\d+)\+(\d+)$/)
  if (m)                             return parseInt(m[1]) * (1 + parseInt(m[2])) / 2 + parseInt(m[3])
  return 1
}

// ── Test runner ───────────────────────────────────────────────────────────────

let pass = 0, fail = 0

function test(name, theory, req) {
  const res = simulate({ ...req, n_trials: N })
  const sim = res.summary.mean_damage
  const err = Math.abs(sim - theory) / Math.max(theory, 0.01)
  const ok  = err <= TOL
  if (ok) pass++; else fail++
  const tag = ok ? '✓ PASS' : '✗ FAIL'
  console.log(`${tag}  ${name.padEnd(34)} theory=${theory.toFixed(3)}  sim=${sim.toFixed(3)}  err=${(err * 100).toFixed(1)}%`)
}

/**
 * Build a simulate() request.
 * weapon   — plain object with { name, attacks, skill, strength, ap, damage, keywords }
 * opts     — { models, buffs, defender, context }  (all optional, sensible defaults)
 */
function mkReq(weapon, { models = 1, buffs = [], defender = {}, context = {} } = {}) {
  return {
    attacks:  [{ models, weapon, buffs }],
    defender: { toughness:4, save:3, invuln:null, wounds:1, models:5, fnp:null, dmg_reduction:false, keywords:[], ...defender },
    context:  { cover:false, half_range:false, attacker_moved:false, attacker_charged:false, target_visible:true, ...context },
  }
}

// ── Section A — Weapon keywords ───────────────────────────────────────────────

console.log('── Weapon keywords ─────────────────────────────────────────\n')

// A1. TORRENT — all attacks auto-hit, no BS roll
// theory = attacks × 1 × pWound × pSaveFail × D
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 3,  MODELS = 1
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 5
  // ────────────────────────────────
  const pW = pGe(woundOn(S, T))
  const pF = pSaveFail(SV, AP)
  test('TORRENT (auto-hit)', MODELS * ATTACKS * 1 * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:3, strength:S, ap:AP, damage:D, keywords:[{ type:'TORRENT' }] },
    { models:MODELS, defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS } },
  ))
})()

// A2. SUSTAINED_HITS X — a critical hit (6+) generates X extra hit dice
// theory = attacks × pHit × (1 + pCrit × X) × pWound × pSaveFail × D
// To change the sustained value: edit SUSTAINED_VAL (e.g. '2', 'D3')
// The engine uses the string directly; theory uses its expected value.
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS      = 4,  SKILL = 3,  MODELS = 1
  const SUSTAINED_VAL = '1'           // ← e.g. '1', '2', 'D3'
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 5
  // ────────────────────────────────
  const X     = expectedRoll(SUSTAINED_VAL)
  const pHit  = pGe(SKILL)
  const pCrit = pGe(6)               // critHitThr default = 6
  const pW    = pGe(woundOn(S, T))
  const pF    = pSaveFail(SV, AP)
  // E[hits/atk] = pHit (primary) + pCrit × X × pHit (sustained extra dice)
  const eHitsPerAtk = pHit + pCrit * X * pHit
  test(`SUSTAINED_HITS ${SUSTAINED_VAL}`, MODELS * ATTACKS * eHitsPerAtk * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'SUSTAINED_HITS', value:SUSTAINED_VAL }] },
    { models:MODELS, defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS } },
  ))
})()

// A3. HEAVY — +1 to hit if the attacker did NOT move this turn
// Effective hit threshold = clamp(skill - 1, 2, 6)  (unmodified 1 still auto-fails)
// theory = attacks × pGe(clamp(skill-1, 2, 6)) × pWound × pSaveFail × D
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 4,  MODELS = 1   // SKILL=4 → base 3/6, heavy → 4/6
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 5
  // ────────────────────────────────
  const pHit = pGe(Math.max(2, SKILL - 1))     // +1 to hit because not moved
  const pW   = pGe(woundOn(S, T))
  const pF   = pSaveFail(SV, AP)
  test('HEAVY (not moved, +1 hit)', MODELS * ATTACKS * pHit * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'HEAVY' }] },
    { models:MODELS, defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS },
      context:{ attacker_moved:false } },        // engine checks !ctx.attacker_moved
  ))
})()

// A4. LANCE — +1 to wound if the attacker charged this turn
// Effective wound threshold = clamp(woundOn(S,T) - 1, 2, 6)
// theory = attacks × pHit × pGe(clamp(wThr-1, 2, 6)) × pSaveFail × D
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 3,  MODELS = 1
  const S = 4,  AP = 0,  D = '1'
  const T = 5,  SV = 3,  W = 1,  DEF_MODELS = 5  // woundOn(4,5)=5 → with lance: 4+
  // ────────────────────────────────
  const wThr = woundOn(S, T)
  const pHit = pGe(SKILL)
  const pW   = pGe(Math.max(2, wThr - 1))     // +1 to wound because charged
  const pF   = pSaveFail(SV, AP)
  test('LANCE (charged, +1 wound)', MODELS * ATTACKS * pHit * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'LANCE' }] },
    { models:MODELS, defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS },
      context:{ attacker_charged:true } },
  ))
})()

// A5. MELTA X — adds roll(X) to damage when within half range
// theory = attacks × pHit × pWound × pSaveFail × (D_base + E[MELTA_VAL])
// W must be large enough to avoid overkill  (W >= max possible damage)
// To change the melta bonus: edit MELTA_VAL (e.g. 'D3', 'D6', '2')
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS   = 3,  SKILL = 3,  MODELS = 1
  const S = 5,  AP = -2,  D_BASE = '1'
  const MELTA_VAL = 'D3'              // ← e.g. 'D3', 'D6', '2'
  const T = 4,  SV = 4,  W = 5,  DEF_MODELS = 1  // W=5 avoids overkill (D1+D3 max=4)
  // ────────────────────────────────
  const pHit    = pGe(SKILL)
  const pW      = pGe(woundOn(S, T))
  const pF      = pSaveFail(SV, AP)
  const eDmg    = expectedRoll(D_BASE) + expectedRoll(MELTA_VAL)
  test(`MELTA ${MELTA_VAL} (half range)`, MODELS * ATTACKS * pHit * pW * pF * eDmg, mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D_BASE, keywords:[{ type:'MELTA', value:MELTA_VAL }] },
    { models:MODELS, defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS },
      context:{ half_range:true } },
  ))
})()

// A6. ANTI [keyword] X+ — auto-wounds (isCrit=true) on roll ≥ threshold vs matching target
// When antiThr < woundOn(S,T): effective wound threshold = antiThr (easier to wound)
// theory = attacks × pHit × pGe(max(2, min(antiThr, wThr))) × pSaveFail × D
// Note: without DEVASTATING_WOUNDS, the wound still goes through the save roll normally.
// To test vs different unit types: edit ANTI_TARGET and set the matching defender keyword.
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS    = 4,  SKILL = 3,  MODELS = 1
  const S = 4,  AP = 0,  D = '1'
  const ANTI_TARGET = 'MONSTER'      // ← defender keyword to match
  const ANTI_THR    = 4              // ← wound automatically on 4+  (must be < woundOn(S,T) to matter)
  const T = 8,  SV = 3,  W = 3,  DEF_MODELS = 1  // woundOn(4,8)=5 → anti 4+ makes it easier
  // ────────────────────────────────
  const wThr = woundOn(S, T)
  const pHit = pGe(SKILL)
  const pW   = pGe(Math.max(2, Math.min(ANTI_THR, wThr)))  // anti threshold takes precedence if lower
  const pF   = pSaveFail(SV, AP)
  test(`ANTI ${ANTI_TARGET} ${ANTI_THR}+`, MODELS * ATTACKS * pHit * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D,
      keywords:[{ type:'ANTI', target:ANTI_TARGET, threshold:ANTI_THR }] },
    { models:MODELS, defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS, keywords:[ANTI_TARGET] } },
  ))
})()

// A7. IGNORES_COVER — defender's cover bonus (+1 armour) is negated
// Without IGNORES_COVER: pSaveFail uses cover=true  (armour improved by 1)
// With    IGNORES_COVER: pSaveFail uses cover=false  (cover flag in context is ignored)
// theory = attacks × pHit × pWound × pSaveFail(SV, AP, no cover) × D
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 3,  MODELS = 1
  const S = 4,  AP = -1,  D = '1'
  const T = 4,  SV = 4,  W = 1,  DEF_MODELS = 3  // cover would give armorSv 4→3 without IG
  // ────────────────────────────────
  const pHit = pGe(SKILL)
  const pW   = pGe(woundOn(S, T))
  const pF   = pSaveFail(SV, AP)    // cover=false: IGNORES_COVER negates it
  test('IGNORES_COVER (cover negated)', MODELS * ATTACKS * pHit * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'IGNORES_COVER' }] },
    { models:MODELS, defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS },
      context:{ cover:true } },      // cover is active but the keyword negates it
  ))
})()

// ── Section B — Attacker abilities / buffs ────────────────────────────────────

console.log('\n── Attacker abilities / buffs ──────────────────────────────\n')

// B1. REROLL_HITS all — re-roll all failed hit dice once
// Engine re-rolls if: die ∈ {fail and not crit}  →  P(re-roll) = 1 - pGe(skill)
// P(hit with reroll) = pGe(skill) + (1 - pGe(skill)) × pGe(skill)
//                    = 1 - (1 - pGe(skill))²
// Use SKILL=4 so the difference vs no-reroll is visible (3/6 → 3/4).
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 4,  MODELS = 1   // SKILL=4 → 3/6 base, 3/4 with reroll
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 5
  // ────────────────────────────────
  const pHit_base = pGe(SKILL)
  const pHit = 1 - (1 - pHit_base) ** 2        // reroll all failures once
  const pW   = pGe(woundOn(S, T))
  const pF   = pSaveFail(SV, AP)
  test('REROLL_HITS all', MODELS * ATTACKS * pHit * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[] },
    { models:MODELS, buffs:[{ type:'REROLL_HITS', value:'all' }],
      defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS } },
  ))
})()

// B2. HIT_MODIFIER +1 — flat +1 to every hit roll (clamped to +1 max by the engine)
// Effective hit threshold = clamp(skill - hitMod, 2, 6)
// Unmodified 1 still auto-fails regardless of modifier.
// To test -1: set HIT_MOD = -1 and pass { type:'HIT_MODIFIER', value:-1 }
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 4,  MODELS = 1   // SKILL=4 → 3/6 base, 4/6 with +1
  const HIT_MOD = 1                             // ← +1 or -1
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 5
  // ────────────────────────────────
  const pHit = pGe(Math.max(2, SKILL - HIT_MOD))  // lower threshold = easier hit
  const pW   = pGe(woundOn(S, T))
  const pF   = pSaveFail(SV, AP)
  test(`HIT_MODIFIER ${HIT_MOD > 0 ? '+' : ''}${HIT_MOD}`, MODELS * ATTACKS * pHit * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[] },
    { models:MODELS, buffs:[{ type:'HIT_MODIFIER', value:HIT_MOD }],
      defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS } },
  ))
})()

// B3. WOUND_MODIFIER +1 — flat +1 to every wound roll (clamped to +1 max by the engine)
// Effective wound threshold = clamp(woundOn(S,T) - woundMod, 2, 6)
// To test -1: set WOUND_MOD = -1 and pass { type:'WOUND_MODIFIER', value:-1 }
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 3,  MODELS = 1
  const WOUND_MOD = 1                          // ← +1 or -1
  const S = 3,  AP = 0,  D = '1'
  const T = 5,  SV = 3,  W = 1,  DEF_MODELS = 5  // woundOn(3,5)=5 → with +1: 4+
  // ────────────────────────────────
  const wThr = woundOn(S, T)
  const pHit = pGe(SKILL)
  const pW   = pGe(Math.max(2, wThr - WOUND_MOD))  // lower threshold = easier wound
  const pF   = pSaveFail(SV, AP)
  test(`WOUND_MODIFIER ${WOUND_MOD > 0 ? '+' : ''}${WOUND_MOD}`, MODELS * ATTACKS * pHit * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[] },
    { models:MODELS, buffs:[{ type:'WOUND_MODIFIER', value:WOUND_MOD }],
      defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS } },
  ))
})()

// B4. FIRE_OVERWATCH (stratagem) — only an unmodified 6 scores a hit
// BS, hit modifiers, and any other bonuses are completely irrelevant.
// theory = attacks × (1/6) × pWound × pSaveFail × D
// Contrast: with BS3+ normally pHit = 4/6, with overwatch pHit = 1/6.
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 6,  SKILL = 3,  MODELS = 1  // SKILL=3 → normally 4/6, overwatch → 1/6
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 5
  // ────────────────────────────────
  const pHit = 1 / 6   // natural 6 only — BS and hitMod play no role
  const pW   = pGe(woundOn(S, T))
  const pF   = pSaveFail(SV, AP)
  test('FIRE_OVERWATCH (only 6s hit)', MODELS * ATTACKS * pHit * pW * pF * expectedRoll(D), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D,
      keywords:[{ type:'FIRE_OVERWATCH' }] },
    { models:MODELS, defender:{ toughness:T, save:SV, wounds:W, models:DEF_MODELS } },
  ))
})()

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('')
console.log(`Results: ${pass} passed, ${fail} failed  (N=${N.toLocaleString()}, tol=±${TOL * 100}%)`)
if (fail > 0) process.exit(1)
