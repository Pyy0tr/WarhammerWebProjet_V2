/**
 * Keyword validation: compare simulation vs theoretical expected damage.
 * Run with: node --experimental-vm-modules src/engine/__tests__/keyword_validation.mjs
 * (or just: node src/engine/__tests__/keyword_validation.mjs from frontend/)
 */

import { simulate } from '../simulation.js'

const N   = 100_000
const TOL = 0.04   // ±4 % — 3σ is ~0.009 at N=100k, so this is very generous

// ── Helpers ───────────────────────────────────────────────────────────────────

const CTX_NEUTRAL = { cover: false, half_range: false, attacker_moved: false, attacker_charged: false, target_visible: true }

function run(weapon, buffs, defender, ctx = CTX_NEUTRAL) {
  return simulate({
    attacks: [{ models: 1, weapon, buffs: buffs ?? [] }],
    defender,
    context: ctx,
    n_trials: N,
  }).summary.mean_damage
}

// Base defender: T4 Sv4+ W1 ×100 — large pool so damage cap never constrains the measurement
const DEF_T4 = { toughness: 4, save: 4, invuln: null, wounds: 1, models: 100, fnp: null, dmg_reduction: false, debuff_hit_roll: false, keywords: [] }

// Base weapon: 10 attacks BS3+ S4 AP0 D1
const W_BASE = { name: 'test', attacks: 10, skill: 3, strength: 4, ap: 0, damage: 1, keywords: [] }

// Probability helpers
const p_hit   = (bs, mod = 0) => Math.max(0, Math.min(1, (7 - Math.max(2, Math.min(6, bs - mod))) / 6))
const p_wound = (s, t) => { const wt = s >= 2*t ? 2 : s > t ? 3 : s === t ? 4 : t >= 2*s ? 6 : 5; return (7 - wt) / 6 }
const p_fail  = (sv)   => Math.max(0, Math.min(1, (Math.min(7, sv) - 1) / 6))

// Effective save: armor vs invuln
const eff_sv  = (save, ap, invuln = null) => {
  const ar = Math.max(save - ap, 2) // ap is stored negative, so save-ap = save+|AP|
  return invuln != null ? Math.min(ar, invuln) : ar
}

// ── Test cases ────────────────────────────────────────────────────────────────

const TESTS = []

function test(name, theoretical, simFn, notes = '') {
  TESTS.push({ name, theoretical, simFn, notes })
}

// ─── 1. Baseline ─────────────────────────────────────────────────────────────
test(
  'Baseline (BS3+ S4 AP0 D1 vs T4 Sv4+)',
  10 * (4/6) * (3/6) * (3/6),
  () => run(W_BASE, [], DEF_T4),
)

// ─── 2. Lethal Hits ───────────────────────────────────────────────────────────
// Crit hit (die=6, p=1/6) → auto-wound (bypass wound roll, still needs save)
// Non-crit hit (die=3-5, p=3/6) → normal wound roll
// E[wounds/atk] = 1/6 * 1 + 3/6 * P(wound)
// E[dmg/atk]   = (1/6 + 3/6 * 3/6) * P(fail_save)
test(
  'Lethal Hits',
  10 * (1/6 + 3/6 * 3/6) * (3/6),
  () => run({ ...W_BASE, keywords: [{ type: 'LETHAL_HITS' }] }, [], DEF_T4),
  'crit hit → auto-wound (not mortal — still needs save)',
)

// ─── 3. Sustained Hits 1 ─────────────────────────────────────────────────────
// Crit hit (1/6) → 1 extra die rolled at BS3+, that extra die can also hit/crit
// but doesn't cascade (depth limit)
// E[hits/atk] = 4/6 + 1/6 * (4/6)   [crit itself = 1 hit + extra hit with P=4/6]
test(
  'Sustained Hits 1',
  10 * (4/6 + 1/6 * 4/6) * (3/6) * (3/6),
  () => run({ ...W_BASE, keywords: [{ type: 'SUSTAINED_HITS', value: '1' }] }, [], DEF_T4),
  'crit → 1 extra die; no cascade',
)

// ─── 4. Devastating Wounds ───────────────────────────────────────────────────
// Crit wound (die=6, 1/6 of wound rolls) → mortal wound: bypasses save
// Non-crit wound (die=2-5 that pass wThr=4+, i.e. die=4-5, p=2/6) → normal save
// P(hit) = 4/6; P(crit wound) = 1/6; P(non-crit wound) = P(wound)-P(crit wound) = 3/6-1/6 = 2/6
// E[dmg/atk] = P(hit) * [P(crit_wound)*1 + P(non-crit_wound)*P(fail_save)]
const p_ncw = 3/6 - 1/6  // non-crit wound prob given a wound roll is made
test(
  'Devastating Wounds — mortal bypass save',
  10 * (4/6) * (1/6 * 1 + p_ncw * (3/6)),
  () => run({ ...W_BASE, keywords: [{ type: 'DEVASTATING_WOUNDS' }] }, [], DEF_T4),
  'crit wound → mortal wound → bypasses armor save',
)

// ─── 5. Dev Wounds + Invuln save: critical wounds bypass even invuln ──────────
// Weapon: AP-4 (save would auto-fail); defender has Inv4++
// Without Dev: effSave = min(8,4) = 4+, P(fail)=3/6
// With Dev:    crit wounds bypass invuln entirely; non-crit wounds use invuln 4++
const DEF_INV4 = { ...DEF_T4, invuln: 4 }
const W_AP4    = { ...W_BASE, ap: -4 }
// P(wound) = 3/6, P(crit wound) = 1/6, P(non-crit wound) = 2/6
// E[dmg/atk] = P(hit) * [P(crit_wound)*1 + P(non-crit_wound)*P(fail_inv)]
//            = (4/6) * [1/6 + 2/6 * 3/6]
test(
  'Dev Wounds bypass invuln save',
  10 * (4/6) * (1/6 + (2/6) * (3/6)),
  () => run({ ...W_AP4, keywords: [{ type: 'DEVASTATING_WOUNDS' }] }, [], DEF_INV4),
  'crit wound with AP-4 + invuln 4++ → crit wounds skip invuln',
)

// Control: same weapon without Dev Wounds — invuln limits damage
test(
  'Invuln 4++ limits AP-4 weapon (no Dev Wounds)',
  10 * (4/6) * (3/6) * (3/6),   // effSave = min(8,4)=4, P(fail)=3/6
  () => run(W_AP4, [], DEF_INV4),
  'baseline check: invuln 4++ should fully absorb AP-4',
)

// ─── 6. CRITICAL_HIT_ON 5+ + Lethal ─────────────────────────────────────────
// critHitThr=5: die=5 or 6 is crit → P(crit)=2/6, P(non-crit hit)=2/6
// With Lethal: crit → auto-wound; non-crit hit → wound roll
// E[wounds/atk] = 2/6 + 2/6 * P(wound)
test(
  'Crit 5+ + Lethal Hits',
  10 * (2/6 + 2/6 * 3/6) * (3/6),
  () => run(
    { ...W_BASE, keywords: [{ type: 'LETHAL_HITS' }] },
    [{ type: 'CRITICAL_HIT_ON', value: 5 }],
    DEF_T4,
  ),
  'crit threshold lowered to 5; more auto-wounds',
)

// ─── 7. CRITICAL_HIT_ON 5+ + Sustained 1 ────────────────────────────────────
// critHitThr=5: P(crit)=2/6 → 1 extra die
// E[hits/atk] = 4/6 + 2/6 * (4/6)
test(
  'Crit 5+ + Sustained 1',
  10 * (4/6 + 2/6 * 4/6) * (3/6) * (3/6),
  () => run(
    { ...W_BASE, keywords: [{ type: 'SUSTAINED_HITS', value: '1' }] },
    [{ type: 'CRITICAL_HIT_ON', value: 5 }],
    DEF_T4,
  ),
)

// ─── 8. Re-roll Hits: 'ones' ──────────────────────────────────────────────────
// Reroll die=1; P(hit after reroll) = 4/6 + 1/6 * 4/6 = 28/36
test(
  'Reroll Hits 1s',
  10 * (4/6 + 1/6 * 4/6) * (3/6) * (3/6),
  () => run(W_BASE, [{ type: 'REROLL_HITS', value: 'ones' }], DEF_T4),
)

// ─── 9. Re-roll Hits: 'all' ───────────────────────────────────────────────────
// Reroll dice 1-2 (misses at BS3+); P(hit after reroll) = 4/6 + 2/6 * 4/6 = 32/36
test(
  'Reroll Hits All',
  10 * (4/6 + 2/6 * 4/6) * (3/6) * (3/6),
  () => run(W_BASE, [{ type: 'REROLL_HITS', value: 'all' }], DEF_T4),
)

// ─── 10. Re-roll Wounds: 'ones' ───────────────────────────────────────────────
// Reroll die=1; P(wound after reroll) = 3/6 + 1/6 * 3/6 = 7/12
test(
  'Reroll Wounds 1s',
  10 * (4/6) * (3/6 + 1/6 * 3/6) * (3/6),
  () => run(W_BASE, [{ type: 'REROLL_WOUNDS', value: 'ones' }], DEF_T4),
)

// ─── 11. Re-roll Wounds: 'all' ────────────────────────────────────────────────
// Reroll all failed wounds; P(wound after reroll) = 3/6 + 3/6 * 3/6 = 3/4
test(
  'Reroll Wounds All',
  10 * (4/6) * (3/6 + 3/6 * 3/6) * (3/6),
  () => run(W_BASE, [{ type: 'REROLL_WOUNDS', value: 'all' }], DEF_T4),
)

// ─── 12. Twin-Linked = Reroll Wounds All ─────────────────────────────────────
test(
  'Twin-Linked (= Reroll Wounds All)',
  10 * (4/6) * (3/6 + 3/6 * 3/6) * (3/6),
  () => run({ ...W_BASE, keywords: [{ type: 'TWIN_LINKED' }] }, [], DEF_T4),
  'TWIN_LINKED in code rerolls all failed wound rolls',
)

// ─── 13. AP_MODIFIER -1 ──────────────────────────────────────────────────────
// effAp = 0 + (-1) = -1; armorSv = 4 - (-1) = 5; P(fail) = 4/6
test(
  'AP Modifier -1',
  10 * (4/6) * (3/6) * (4/6),
  () => run(W_BASE, [{ type: 'AP_MODIFIER', value: -1 }], DEF_T4),
)

// ─── 14. Strength Modifier +1 ────────────────────────────────────────────────
// effStr = 5 vs T4 → wound on 3+; P(wound) = 4/6
test(
  'Strength Modifier +1',
  10 * (4/6) * (4/6) * (3/6),
  () => run(W_BASE, [{ type: 'STRENGTH_MODIFIER', value: 1 }], DEF_T4),
)

// ─── 15. Attacks Modifier +1 ─────────────────────────────────────────────────
// numAttacks = 10 + 1 = 11
test(
  'Attacks Modifier +1',
  11 * (4/6) * (3/6) * (3/6),
  () => run(W_BASE, [{ type: 'ATTACKS_MODIFIER', value: 1 }], DEF_T4),
)

// ─── 16. Damage Modifier +1 on W1 model ──────────────────────────────────────
// D1+1=2 but vs W1 model → dealt = min(2,1) = 1 → no gain!
test(
  'Damage +1 vs W1 model (no effect — overkill cap)',
  10 * (4/6) * (3/6) * (3/6) * 1,   // same as baseline
  () => run(W_BASE, [{ type: 'DAMAGE_MODIFIER', value: 1 }], DEF_T4),
  'excess damage capped per model (BUG-002 guard)',
)

// ─── 17. Damage Modifier +1 on W3 model ──────────────────────────────────────
// D1+1=2, model has many wounds → dealt = 2 per unsaved wound (no per-model overkill cap)
const DEF_W3 = { ...DEF_T4, wounds: 100 }
test(
  'Damage +1 vs W3 model (full benefit)',
  10 * (4/6) * (3/6) * (3/6) * 2,
  () => run(W_BASE, [{ type: 'DAMAGE_MODIFIER', value: 1 }], DEF_W3),
)

// ─── 18. Torrent ─────────────────────────────────────────────────────────────
// All attacks auto-hit; P(hit) = 1
test(
  'Torrent (auto-hit)',
  10 * 1 * (3/6) * (3/6),
  () => run({ ...W_BASE, keywords: [{ type: 'TORRENT' }] }, [], DEF_T4),
)

// ─── 19. FNP 5+ ──────────────────────────────────────────────────────────────
// FNP 5+: roll D6 per damage point; die < 5 = damage applies (4/6)
// P(damage_after_fnp) = 4/6
test(
  'Feel No Pain 5+',
  10 * (4/6) * (3/6) * (3/6) * (4/6),
  () => run(W_BASE, [], { ...DEF_T4, fnp: 5 }),
  'FNP 5+ saves on 5+, fails on 1-4',
)

// ─── 20. FNP 5+ on Mortal Wounds (Dev Wounds) ────────────────────────────────
// Mortal wounds from Dev Wounds also go through FNP (correct per 10e rules)
// E[dmg/atk] = P(hit) * [P(crit_wound)*P(dmg_after_fnp) + P(ncrit_wound)*P(fail_save)*P(dmg_after_fnp)]
const fnp5_factor = 4/6
test(
  'Dev Wounds + FNP 5+ (FNP applies to mortals)',
  10 * (4/6) * (1/6 * fnp5_factor + p_ncw * (3/6) * fnp5_factor),
  () => run({ ...W_BASE, keywords: [{ type: 'DEVASTATING_WOUNDS' }] }, [], { ...DEF_T4, fnp: 5 }),
  'mortal wounds go through FNP in 10e',
)

// ─── 21. Anti-INFANTRY 4+ vs INFANTRY ────────────────────────────────────────
// S4 vs T5: normally wound on 5+ (P=2/6)
// Anti-INFANTRY 4+: die >= 4 AND target has INFANTRY → crit wound (auto-success)
// P(wound) = P(die >= 4) = 3/6 (Anti trigger, always wounds)
// Also die 5 and 6 would wound normally anyway, so Anti adds die=4 only
// Net: P(wound with Anti vs INFANTRY) = P(die>=4) = 3/6 vs normal 2/6
const DEF_INF_T5 = { ...DEF_T4, toughness: 5, keywords: ['INFANTRY'] }
const W_S4_ANTI  = { ...W_BASE, keywords: [{ type: 'ANTI', target: 'INFANTRY', threshold: 4 }] }
// P(wound) = 3/6 (die=4,5,6 all wound via Anti)
test(
  'Anti-INFANTRY 4+ vs INFANTRY T5',
  10 * (4/6) * (3/6) * (3/6),   // wound on 4+ instead of 5+
  () => run(W_S4_ANTI, [], DEF_INF_T5),
  'Anti 4+ on T5 INFANTRY: wounds on 4+ instead of 5+',
)

// Control: Anti vs non-INFANTRY target (Anti has no effect → wound on 5+)
const DEF_NON_INF_T5 = { ...DEF_INF_T5, keywords: ['VEHICLE'] }
test(
  'Anti-INFANTRY 4+ vs VEHICLE T5 (no effect)',
  10 * (4/6) * (2/6) * (3/6),   // normal wound on 5+
  () => run(W_S4_ANTI, [], DEF_NON_INF_T5),
  'Anti has no effect on non-matching keyword',
)

// ─── 22. Blast (vs 10-model unit) ────────────────────────────────────────────
// BLAST: +floor(models/5) bonus attacks = +2 for 10 models
// Total attacks = 10 + 2 = 12
const DEF_10M = { ...DEF_T4, models: 10 }
test(
  'Blast vs 10 models (+2 attacks)',
  12 * (4/6) * (3/6) * (3/6),
  () => run({ ...W_BASE, keywords: [{ type: 'BLAST' }] }, [], DEF_10M),
)

// ─── 23. Sustained Hits no cascade ───────────────────────────────────────────
// Verify: extra dice from Sustained don't themselves trigger more Sustained
// Test: Sustained 2 + count expected hits at BS5+ (high miss rate amplifies any cascade)
// BS5+ (skill=5): P(hit)=2/6, P(crit)=1/6, P(non-crit hit)=1/6
// E[hits/atk] = 2/6 + 1/6 * (2 + P(hit_extra_die) * 2)
//             = 2/6 + 1/6 * (2 + 2/6 * 2)
//             with depth=1: each extra die can crit but not chain further
const W_SUST2_BS5 = { ...W_BASE, skill: 5, keywords: [{ type: 'SUSTAINED_HITS', value: '2' }] }
// P(crit)=1/6, 2 extra dice, each with P(hit)=2/6 and can themselves crit
// For each original attack:
//   P(non-crit hit)=1/6 → 1 hit
//   P(crit)=1/6 → 1 hit + roll 2 extra dice (each at BS5+, depth=1)
//     Each extra die: P(hit)=2/6 (no further extra dice)
// E[hits/atk] = 1/6 + 1/6 * (1 + 2 * 2/6)
//             = 1/6 + 1/6 * (1 + 4/6)
//             = 1/6 + 1/6 * 10/6 = 1/6 + 10/36 = 6/36 + 10/36 = 16/36
test(
  'Sustained 2 at BS5+ — no cascade (depth guard)',
  10 * (16/36) * (3/6) * (3/6),
  () => run(W_SUST2_BS5, [], DEF_T4),
  'if depth guard broken, extra extra dice would inflate result',
)

// ─── 24. Invuln 3++ ──────────────────────────────────────────────────────────
// Weapon AP-4, defender Sv4+ Inv3++
// effSave = min(8, 3) = 3; P(fail) = 2/6
const DEF_INV3 = { ...DEF_T4, invuln: 3 }
test(
  'Invuln 3++ vs AP-4 weapon',
  10 * (4/6) * (3/6) * (2/6),
  () => run(W_AP4, [], DEF_INV3),
)

// ─── 25. Damage Reduction (dmg_reduction = -1, min 1) ────────────────────────
// D3 weapon vs W3 model with dmg_reduction:
// roll(3) → average 2; after reduction: max(1, 2-1) = 1 on average
// But E[roll D3] = 2; E[max(1, D3-1)] = E[D3-1] since D3-1 ≥ 1 always (D3 min=1 → 1-1=0 → max(1,0)=1)
// D3: 1→0→max(1,0)=1; 2→1; 3→2  avg = (1+1+2)/3 = 4/3
const DEF_DMG_RED = { ...DEF_T4, dmg_reduction: true, wounds: 100 }
const W_D3 = { ...W_BASE, damage: 'D3' }
// E[dealt per unsaved wound] = E[max(1, D3-1)] = 4/3
// capped by W3: min(4/3, 3) = 4/3 (no cap, 4/3 < 3)
test(
  'Damage Reduction (-1 min 1) vs D3 weapon on W3 model',
  10 * (4/6) * (3/6) * (3/6) * (4/3),
  () => run(W_D3, [], DEF_DMG_RED),
  'D3 avg=2; after -1 → D3-1 avg=1 but min 1 on 1 → E=4/3',
)

// ─── 26. Cover (+1 armor save, not invuln) ────────────────────────────────────
// Cover: armorSv -= 1 (improves by 1); AP0, Sv4+ → armorSv = 4-1 = 3
// P(fail save) = 2/6
const CTX_COVER = { ...CTX_NEUTRAL, cover: true }
test(
  'Cover (+1 to armor save)',
  10 * (4/6) * (3/6) * (2/6),
  () => run(W_BASE, [], DEF_T4, CTX_COVER),
  'cover improves armor save by 1 step',
)

// Cover doesn't help vs invuln
test(
  'Cover does NOT improve invuln save',
  10 * (4/6) * (3/6) * (3/6),  // effSave = min(4, 4) = 4 — armor would be 3 w/ cover but invuln dominates... wait
  // Actually: armorSv w/ cover = min(4-(-4)+cover_bonus)... let me think
  // Weapon AP-4, Sv4+ → armor 8 w/o cover → w/ cover = 8-1=7 → still auto-fail
  // Inv4++ → effSave = min(7,4)=4; cover didn't help
  () => run(W_AP4, [], DEF_INV4, CTX_COVER),
  'cover improves armor save but invuln is not affected by cover',
)

// ─── 27. HIT_MODIFIER +1 (Heavy not moved) ───────────────────────────────────
// Heavy keyword: if attacker did not move → hitMod += 1
// BS3+ + hitMod+1 = effectively BS2+ → P(hit) = 5/6
const CTX_NOT_MOVED = { ...CTX_NEUTRAL, attacker_moved: false }
test(
  'Heavy (+1 hit if not moved)',
  10 * (5/6) * (3/6) * (3/6),
  () => run({ ...W_BASE, keywords: [{ type: 'HEAVY' }] }, [], DEF_T4, CTX_NOT_MOVED),
)

// ─── 28. Rapid Fire ×1 at half range ─────────────────────────────────────────
// At half range: +roll(1) extra attacks per model = +1 attack
// Total = 10 + 1 = 11
const CTX_HALF = { ...CTX_NEUTRAL, half_range: true }
test(
  'Rapid Fire 1 at half range (+1 attack)',
  11 * (4/6) * (3/6) * (3/6),
  () => run({ ...W_BASE, keywords: [{ type: 'RAPID_FIRE', value: '1' }] }, [], DEF_T4, CTX_HALF),
)

// ─── 29. SAVE_MODIFIER +1 (worsens defender save) ────────────────────────────
// SAVE_MODIFIER +1 means save gets 1 worse → effSave = 4+1 = 5; P(fail) = 4/6
test(
  'Save Modifier +1 (defender save worsens by 1)',
  10 * (4/6) * (3/6) * (4/6),
  () => run(W_BASE, [{ type: 'SAVE_MODIFIER', value: 1 }], DEF_T4),
)

// ─── Runner ───────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
console.log('║         WH40K SIMULATION KEYWORD VALIDATION                         ║')
console.log(`╚══════════════════════════════════════════════════════════════════════╝`)
console.log(`  N = ${N.toLocaleString()} trials/test   tolerance = ±${(TOL*100).toFixed(0)}%\n`)

let passed = 0, failed = 0
const failures = []

for (const t of TESTS) {
  const sim   = t.simFn()
  const err   = Math.abs(sim - t.theoretical) / Math.max(t.theoretical, 0.01)
  const ok    = err <= TOL
  const icon  = ok ? '✓' : '✗'
  const color = ok ? '\x1b[32m' : '\x1b[31m'
  const reset = '\x1b[0m'

  if (ok) { passed++ } else { failed++; failures.push(t.name) }

  const pct = (err * 100).toFixed(1)
  const row = `${color}${icon}${reset} ${t.name.padEnd(46)} theory=${t.theoretical.toFixed(3).padStart(6)}  sim=${sim.toFixed(3).padStart(6)}  err=${pct.padStart(5)}%`
  console.log(row)
  if (t.notes) console.log(`    \x1b[2m↳ ${t.notes}\x1b[0m`)
}

console.log('\n──────────────────────────────────────────────────────────────────────')
console.log(`  ${passed} passed  |  ${failed} failed`)
if (failures.length > 0) {
  console.log('\n\x1b[31mFAILED TESTS:\x1b[0m')
  failures.forEach(f => console.log(`  ✗ ${f}`))
}
console.log()

process.exit(failed > 0 ? 1 : 0)
