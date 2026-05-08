/**
 * engine_test.mjs — WH40K 10e simulation engine regression tests
 * ─────────────────────────────────────────────────────────────────
 * Usage:   node frontend/engine_test.mjs
 * Exit:    0 if all pass, 1 if any fail
 *
 * PURPOSE
 * -------
 * Each test derives an exact closed-form expected damage value (theory)
 * and compares it to the Monte Carlo mean returned by simulate().
 * This validates that the engine's probability model is correct and
 * catches regressions whenever the engine or a rule implementation changes.
 *
 * GLOBAL SETTINGS (top of file)
 * ──────────────────────────────
 *   N   — number of Monte Carlo trials per test (higher = more accurate but slower)
 *   TOL — relative tolerance for PASS/FAIL  (0.15 = ±15 %)
 *
 * THEORY HELPERS
 * ──────────────
 *   woundOn(S, T)         → minimum roll needed to wound (2–6)
 *   pGe(t)                → P(1d6 ≥ t)
 *   pSaveFail(sv, ap, inv, cover) → P(save roll fails), mirrors engine logic
 *   eDmgReduced(expr, r)  → E[max(1, D − r)] for a damage die expression
 *                           expr: 'D3' | 'D6' | flat number string
 *                           r:    amount subtracted (default 1)
 *
 * OUTPUT FORMAT
 * ─────────────
 *   ✓ PASS  <name>   theory=X.XXX  sim=Y.YYY  err=Z.Z%
 *   ✗ FAIL  <name>   theory=X.XXX  sim=Y.YYY  err=Z.Z%
 *
 * HOW TO ADD A TEST
 * ─────────────────
 * Copy any existing ;(()=>{ ... })() block, place it before the summary,
 * and call test(name, theory, mkReq(weapon, defender, context)).
 * Derive `theory` step by step: attacks × pHit × pWound × pSaveFail × eDmg.
 *
 * HOW TO MODIFY A TEST
 * ────────────────────
 * Each test block opens with a CONFIG section of named constants.
 * Change those constants only — the formula and simulate() call
 * update automatically. Do NOT edit the formula lines directly.
 *
 * DAMAGE REDUCTION NOTE
 * ─────────────────────
 * The engine applies `-REDUCTION to damage, minimum 1` after the melta
 * bonus and before FNP. Only flat reductions are currently implemented.
 * To test a different weapon damage, change DMG_EXPR in test 4.
 * To test a different reduction amount (future feature), change REDUCTION
 * and the engine call will need dmg_reduction updated accordingly.
 */

import { simulate } from './src/engine/simulation.js'

// ── Global settings ───────────────────────────────────────────────────────────

const N   = 10_000   // Monte Carlo trials per test  (increase for tighter err%)
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
  let armor = save - ap       // ap stored as 0, -1, -2 …
  if (cover) armor -= 1      // cover improves armor by 1
  armor = Math.max(armor, 2)
  const eff  = invuln != null ? Math.min(armor, invuln) : armor
  const effC = Math.min(eff, 7)
  return Math.max(0, (effC - 1) / 6)
}

/**
 * E[max(1, D - reduction)] for a damage die expression.
 *
 * expr     'D3' | 'D6' | flat number string e.g. '2'
 * reduction  amount subtracted from each face (default 1, min result is 1)
 *
 * Examples:
 *   eDmgReduced('D3', 1)  →  (1+1+2)/3  ≈ 1.333
 *   eDmgReduced('D6', 1)  →  (1+1+2+3+4+5)/6  ≈ 2.667
 *   eDmgReduced('2',  1)  →  max(1, 2-1) = 1
 */
function eDmgReduced(expr, reduction = 1) {
  const str = String(expr).toUpperCase()
  let faces
  if      (str === 'D3') faces = [1, 2, 3]
  else if (str === 'D6') faces = [1, 2, 3, 4, 5, 6]
  else {
    const n = parseInt(str, 10)
    faces = [n]
  }
  const reduced = faces.map(d => Math.max(1, d - reduction))
  return reduced.reduce((s, v) => s + v, 0) / reduced.length
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

// Builds a simulate() request from the minimum required fields.
// Unspecified defender/context fields get sensible defaults.
function mkReq(weapon, defender, context = {}) {
  return {
    attacks:  [{ models: weapon._models ?? 1, weapon, buffs: [] }],
    defender: { toughness:4, save:3, invuln:null, wounds:1, models:5, fnp:null, dmg_reduction:false, ...defender },
    context:  { cover:false, half_range:false, attacker_moved:false, attacker_charged:false, target_visible:true, ...context },
  }
}

// ── Test cases ────────────────────────────────────────────────────────────────

console.log('Running engine tests…\n')

// 1. Basic pipeline — 5×A2 BS3+ S4 AP0 D1 vs T4 Sv3+ W1 5 models
;(() => {
  // CONFIG ─────────────────────────
  const ATK_MODELS = 5,  ATTACKS = 2,  SKILL = 3
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 5
  // ────────────────────────────────
  const pH = pGe(SKILL), pW = pGe(woundOn(S, T)), pF = pSaveFail(SV, AP)
  test('Basic pipeline', ATK_MODELS * ATTACKS * pH * pW * pF * 1, mkReq(
    { name:'basic', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[], _models:ATK_MODELS },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS },
  ))
})()

// 2. Invulnerable save — 1×A4 BS3+ S6 AP-3 D1 vs T4 Sv3+ Inv4+ W3 1 model
// armorSv = 3+3 = 6, invuln 4 wins → effSave 4 → pFail 3/6
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 3
  const S = 6,  AP = -3,  D = '1'
  const T = 4,  SV = 3,  INV = 4,  W = 3,  DEF_MODELS = 1
  // ────────────────────────────────
  const pH = pGe(SKILL), pW = pGe(woundOn(S, T)), pF = pSaveFail(SV, AP, INV)
  test('Invulnerable save (4++)', ATTACKS * pH * pW * pF * 1, mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[] },
    { toughness:T, save:SV, invuln:INV, wounds:W, models:DEF_MODELS },
  ))
})()

// 3. Feel No Pain 5+ — 1×A6 BS3+ S4 AP0 D1 vs T4 Sv4+ W2 FNP5+ 3 models
// Damage sticks if die < FNP threshold  →  pFnpFail = (FNP - 1) / 6
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 6,  SKILL = 3
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 4,  FNP = 5,  W = 2,  DEF_MODELS = 3
  // ────────────────────────────────
  const pH = pGe(SKILL), pW = pGe(woundOn(S, T)), pF = pSaveFail(SV, AP)
  const pFnpFail = (FNP - 1) / 6
  test('Feel No Pain (5+)', ATTACKS * pH * pW * pF * 1 * pFnpFail, mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[] },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS, fnp:FNP },
  ))
})()

// 4. Damage reduction (-1 min 1) — 1×A3 BS3+ S4 AP0 vs T4 Sv4+ W3 1 model
// Engine: dmg = Math.max(1, roll(damage) - 1)
// Theory: enumerate die faces, apply reduction, compute expected value with eDmgReduced().
//
// To test another damage expression, change DMG_EXPR (e.g. 'D6').
// To test another reduction amount, change REDUCTION and update the engine
// call once the engine supports variable reduction values.
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS   = 3
  const SKILL     = 3
  const S         = 4,  AP = 0
  const DMG_EXPR  = 'D3'   // damage characteristic  ← change here
  const REDUCTION = 1      // subtracted from each damage roll (min result 1)
  const T         = 4,  SV = 4,  W = 3,  DEF_MODELS = 1
  // ────────────────────────────────
  const pH   = pGe(SKILL)
  const pW   = pGe(woundOn(S, T))
  const pF   = pSaveFail(SV, AP)
  const eDmg = eDmgReduced(DMG_EXPR, REDUCTION)
  test(`Damage reduction ${DMG_EXPR} (-${REDUCTION} min 1)`, ATTACKS * pH * pW * pF * eDmg, mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:DMG_EXPR, keywords:[] },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS, dmg_reduction:true },
  ))
})()

// 5. Lethal Hits — 5×A1 BS3+ S3 AP0 D1 vs T6 Sv4+ W1 5 models
// Crit hit (6+) auto-wounds (still needs save). Normal hits wound on 6+.
;(() => {
  // CONFIG ─────────────────────────
  const ATK_MODELS = 5,  ATTACKS = 1,  SKILL = 3
  const S = 3,  AP = 0,  D = '1'
  const T = 6,  SV = 4,  W = 1,  DEF_MODELS = 5
  // ────────────────────────────────
  const pCrit    = pGe(6)
  const pNorm    = pGe(SKILL) - pCrit
  const pW       = pGe(woundOn(S, T))
  const pF       = pSaveFail(SV, AP)
  const eUnsaved = ATK_MODELS * ATTACKS * (pCrit + pNorm * pW) * pF
  test('Lethal Hits', eUnsaved * 1, mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'LETHAL_HITS' }], _models:ATK_MODELS },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS },
  ))
})()

// 6. Devastating Wounds — 1×A4 BS3+ S4 AP0 D1 vs T4 Sv2+ W2 3 models
// Crit wound (6+) = mortal wound, bypasses save entirely.
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 3
  const S = 4,  AP = 0,  D = '1'
  const T = 4,  SV = 2,  W = 2,  DEF_MODELS = 3
  // ────────────────────────────────
  const pH     = pGe(SKILL)
  const pCritW = pGe(6)
  const pNormW = pGe(woundOn(S, T)) - pCritW
  const pF     = pSaveFail(SV, AP)
  test('Devastating Wounds', ATTACKS * pH * (pCritW * 1 + pNormW * pF * 1), mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'DEVASTATING_WOUNDS' }] },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS },
  ))
})()

// 7. Blast — 1×Redemptor D6+1 BS3+ S8 AP-3 D2 vs T5 Sv4+ W1 20 models
// blastBonus = floor(models/5) = 4 per weapon → numAtk = E[D6]+1+4 = 8.5
// armorSv = 4+3 = 7 → always fails. D2 vs W1 → overkill → effectiveDmg = 1.
;(() => {
  // CONFIG ─────────────────────────
  const SKILL = 3
  const S = 8,  AP = -3,  D = '2'
  const T = 5,  SV = 4,  W = 1,  DEF_MODELS = 20
  // ────────────────────────────────
  const pH    = pGe(SKILL)
  const pW    = pGe(woundOn(S, T))
  const pF    = 1                          // effSave 7 → always fails
  const eDmg  = 1                          // D2 but W1 → overkill, effective = 1
  const eAtk  = 3.5 + 1 + Math.floor(DEF_MODELS / 5)  // E[D6] + flat + blast bonus
  test('Blast D6+1 vs 20 models', eAtk * pH * pW * pF * eDmg, mkReq(
    { name:'Macro Plasma', attacks:'D6+1', skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'BLAST' }] },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS },
  ))
})()

// 8. Rapid Fire ×2 at half range — 1×A2 BS3+ S4 AP-1 D1 vs T4 Sv3+ W1 3 models
// numAtk = (base attacks) + (rapid value) × models = 2 + 2×1 = 4
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 2,  RAPID_VAL = 2,  SKILL = 3
  const S = 4,  AP = -1,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 3
  // ────────────────────────────────
  const totalAtk = ATTACKS + RAPID_VAL
  const pH = pGe(SKILL), pW = pGe(woundOn(S, T)), pF = pSaveFail(SV, AP)
  test('Rapid Fire ×2 (half range)', totalAtk * pH * pW * pF * 1, mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'RAPID_FIRE', value:String(RAPID_VAL) }] },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS },
    { half_range: true },
  ))
})()

// 9. Twin Linked — 1×A4 BS3+ S3 AP0 D1 vs T6 Sv5+ W1 3 models
// Wound on 6+. Twin Linked re-rolls any failure once:
//   P(wound) = 1 - P(fail)^2 = 1 - (5/6)^2 = 11/36
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 3
  const S = 3,  AP = 0,  D = '1'
  const T = 6,  SV = 5,  W = 1,  DEF_MODELS = 3
  // ────────────────────────────────
  const pH  = pGe(SKILL)
  const pW1 = pGe(woundOn(S, T))
  const pW  = 1 - (1 - pW1) ** 2      // reroll once
  const pF  = pSaveFail(SV, AP)
  test('Twin Linked (wound reroll)', ATTACKS * pH * pW * pF * 1, mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[{ type:'TWIN_LINKED' }] },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS },
  ))
})()

// 10. Cover — 1×A4 BS3+ S4 AP-1 D1 vs T4 Sv3+ W1 3 models, in cover
// armorSv = 3+1=4, cover improves by 1 → 3 → pFail = 2/6
;(() => {
  // CONFIG ─────────────────────────
  const ATTACKS = 4,  SKILL = 3
  const S = 4,  AP = -1,  D = '1'
  const T = 4,  SV = 3,  W = 1,  DEF_MODELS = 3
  // ────────────────────────────────
  const pH = pGe(SKILL), pW = pGe(woundOn(S, T)), pF = pSaveFail(SV, AP, null, true)
  test('Cover (+1 armour save)', ATTACKS * pH * pW * pF * 1, mkReq(
    { name:'test', attacks:String(ATTACKS), skill:SKILL, strength:S, ap:AP, damage:D, keywords:[] },
    { toughness:T, save:SV, wounds:W, models:DEF_MODELS },
    { cover: true },
  ))
})()

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('')
console.log(`Results: ${pass} passed, ${fail} failed  (N=${N.toLocaleString()}, tol=±${TOL * 100}%)`)
if (fail > 0) process.exit(1)
