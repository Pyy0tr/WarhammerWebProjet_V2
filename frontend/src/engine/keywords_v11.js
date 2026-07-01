/**
 * engine/keywords_v11.js
 * V11 preview of the keyword registry — documentation/UI content only.
 *
 * IMPORTANT: this does NOT change simulation behaviour. simulation.js still
 * implements 10th Edition mechanics end to end; selecting the V11 edition on
 * the Keywords page only swaps which rule text/notes are displayed, so the
 * "display only vs simulated" badges and any live comparison numbers below
 * still reflect the V10 engine. Each entry that changed for V11 says so
 * explicitly in its `note`.
 *
 * See V11_CHANGES.md at the repo root for the full list of confirmed V11
 * changes and their sources. Entries not listed there as changed are copied
 * unmodified from keywords.js.
 */

export const KEYWORD_REGISTRY_V11 = [

  // ── Hit phase ──────────────────────────────────────────────────────────────

  {
    type: 'TORRENT', label: 'Torrent', group: 'hit',
    tip: 'Auto-hit, no roll needed',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, that attack automatically hits the target. No Hit roll is made.",
    note: "No change confirmed for V11. Torrent weapons bypass Ballistic Skill entirely — they always hit regardless of modifiers, cover, or penalties.",
    when: "Use when BS is poor or you face to-hit penalties. Every attack lands — ideal for template weapons and flamers where missing would waste the high attack count.",
    implemented: true,
  },
  {
    type: 'LETHAL_HITS', label: 'Lethal Hits', group: 'hit',
    tip: 'Critical hit → auto-wound (save still applies)',
    phase: 'Hit Roll → Wound Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Hit is scored, that attack automatically wounds the target.",
    note: "No change confirmed for V11. The wound roll is skipped — the attack goes directly to saves at full AP and Damage. Saves still apply.",
    when: "Most effective against high-Toughness targets where the wound roll is the main bottleneck (needing 5+ or 6+). Combine with Crit Hit On 5+ to increase critical frequency and auto-wound more reliably.",
    implemented: true,
  },
  {
    type: 'SUSTAINED_HITS', label: 'Sustained Hits', group: 'hit',
    valued: true, default: '1',
    tip: 'Crit → X extra hit rolls',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Hit is scored, that hit scores X additional hits on the target. The additional hits are not Critical Hits and cannot themselves generate Sustained Hits.",
    note: "No change confirmed for V11. The extra hits roll to wound normally and benefit from re-roll abilities. No cascade — extra hits do not trigger further Sustained Hits.",
    when: "Scales with attack volume — more dice means more critical opportunities. Pair with Crit Hit On 5+ to generate extra hits on 1 in 3 dice instead of 1 in 6. Best on units that unload many attacks in a single activation.",
    implemented: true,
  },
  {
    type: 'HEAVY', label: 'Heavy', group: 'hit',
    tip: "+1 to hit if unengaged, not deployed this turn, moved ≤3\"",
    phase: 'Hit Roll',
    rule: "In your Shooting phase, each time an attack is made with this weapon, add 1 to the Hit roll if all of the following apply to the attacking unit: that unit is unengaged; that unit was not set up on the battlefield this turn; no model in that unit has moved more than 3\" this turn.",
    note: "CHANGED FOR V11 (confirmed via the community dataset's rule text) — but not an engine change. V10 required the unit to be fully stationary (Remained Stationary); V11 allows up to 3\" of movement, but adds two extra conditions — unengaged, and not set up this turn (so a unit that just arrived via Deep Strike doesn't get the bonus). The dice math is identical either way (a flat +1 to the Hit roll, applied after the roll, never affecting Critical Hit): only the real-world justification for checking the 'Remained stationary' toggle changes, not what the toggle does. Both simulation.js and simulation_v11.js implement Heavy the same way.",
    when: "In V11, track three things: did any model move more than 3\"? Is the unit unengaged? Did it arrive this turn? All three must hold to get the bonus — a looser bar than V10's full immobility requirement, so Heavy weapons see more use on the move.",
    implemented: true,
  },
  {
    type: 'ASSAULT', label: 'Assault', group: 'hit',
    tip: 'No penalty for advancing',
    phase: 'Shooting Phase',
    rule: "This weapon can be fired even if the bearer's unit Advanced this turn. If it did, subtract 1 from the Hit roll unless the weapon also has the Torrent ability.",
    note: "No change confirmed for V11. Not simulated — the advancing state is not tracked by this engine. Selecting Assault has no effect on simulation results.",
    when: "Relevant when your unit Advances and shoots in the same turn. Because the advancing state isn't tracked in this simulator, enabling Assault has no effect on the numbers.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'RAPID_FIRE', label: 'Rapid Fire', group: 'hit',
    valued: true, default: '1',
    tip: '+X attacks at half range',
    phase: 'Shooting Phase',
    rule: "Each time the bearer's unit is selected to shoot, if the target is within half the weapon's range, the Attacks characteristic is increased by X.",
    note: "No change confirmed for V11. Enable 'Half range' in context to activate the extra attacks. Stacks with Blast.",
    when: "Enable 'Half range' whenever your models are within half the weapon's range. The bonus scales with model count — a 5-model unit with Rapid Fire 1 gains 5 extra attacks. Stacks with Blast for massive attack pools.",
    implemented: true,
  },
  {
    type: 'INDIRECT_FIRE', label: 'Indirect Fire', group: 'hit',
    tip: '-1 to hit if target not visible',
    phase: 'Hit Roll',
    rule: "This weapon can target and make attacks against units that are not visible to the attacking model. If the target is not visible, subtract 1 from the Hit roll and the target is treated as having the Benefit of Cover.",
    note: "No change confirmed for V11. Enable 'Target not visible' in context. Even if the target is in the open, it gains cover when hit indirectly.",
    when: "Enable 'Target not visible' to model indirect fire. Remember that the target automatically gains the Benefit of Cover, even if it's standing in the open — factor this into your save calculations.",
    implemented: true,
  },
  {
    type: 'CLOSE_QUARTERS', label: 'Close-Quarters', group: 'hit',
    tip: 'Renamed from Pistol — mechanic changed, not just renamed',
    phase: 'Shooting Phase',
    rule: "Units containing one or more models with a [CLOSE-QUARTERS] weapon can shoot using close-quarters shooting. When using another shooting type, each model in that unit (excluding MONSTER/VEHICLE models) must pick either its [CLOSE-QUARTERS] weapons or its other ranged weapons to make attacks with for that unit — not both.",
    note: "RENAMED AND CHANGED FOR V11 (confirmed via the community dataset — 'Pistol' and 'Close-Quarters' currently coexist as names in the data, likely mid-transition). This is not just a rename: V10's Pistol let a weapon fire while the bearer's unit was within Engagement Range of the enemy. V11's Close-Quarters is a different mechanic — a per-model exclusivity rule between close-quarters weapons and other ranged weapons, referencing a 'close-quarters shooting' rules section not captured in the data extracted so far. Not simulated — positional/loadout-choice mechanics are out of scope for this engine either way.",
    when: "Relevant when a unit carries both close-quarters and other ranged weapons and must choose which set each model fires with. The simulator doesn't track unit composition or shooting-type choice, so this has no effect on results.",
    implemented: false, notSimulated: true,
  },

  // ── Wound phase ────────────────────────────────────────────────────────────

  {
    type: 'TWIN_LINKED', label: 'Twin-linked', group: 'wound',
    tip: 'Re-roll all wound rolls',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, you can re-roll the Wound roll.",
    note: "No change confirmed for V11. Applies to every wound roll, not just failures. A full re-roll, not limited to results of 1.",
    when: "Strongest on high-damage weapons (D3, D6+) where a failed wound roll wastes the most. Also valuable when wounding requires a 5+ or 6+ — the re-roll nearly doubles your successful wound rate in those cases.",
    implemented: true,
  },
  {
    type: 'DEVASTATING_WOUNDS', label: 'Dev. Wounds', group: 'wound',
    tip: 'Critical wound → mortal wounds = damage',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Wound is scored, the target suffers Mortal Wounds equal to the Damage characteristic. The attack sequence ends — no saving throw is made.",
    note: "No change confirmed for V11 to the core mechanic. The community dataset's rule text adds one clarification not previously documented here: mortal wounds from Devastating Wounds can damage a maximum of one model per Critical Wound — excess is lost, not spilled to other models. This already matches how the engine caps damage per unsaved wound, so no code change needed.",
    when: "Most impactful against heavily armored targets (2+ saves, strong invulnerable saves) where normal damage would be saved. Pair with ANTI X+ to lower the critical wound threshold from 6+ to 4+ or 5+, massively increasing mortal wound output.",
    implemented: true,
  },
  {
    type: 'LANCE', label: 'Lance', group: 'wound',
    tip: '+1 to wound if attacker charged',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, if the bearer's unit made a Charge move this turn, add 1 to that attack's Wound roll.",
    note: "No change confirmed for V11. Like Heavy, the +1 is applied after the roll and does not affect whether a wound is Critical (unmodified 6 only). Enable 'Attacker charged' in context.",
    when: "Enable 'Attacker charged' on the turn your unit charges. Particularly valuable when your Strength only barely wounds the target — Lance can shift the wound roll from 5+ to 4+, nearly doubling your wound rate.",
    implemented: true,
  },
  {
    type: 'MELTA', label: 'Melta', group: 'wound',
    valued: true, default: '2',
    tip: '+X damage at half range',
    phase: 'Damage',
    rule: "Each time an attack is made with this weapon, if the target is within half this weapon's range, increase the Damage characteristic of that attack by X.",
    note: "No change confirmed for V11. Enable 'Half range' in context to activate the bonus damage. A Melta 2 weapon with D6 damage becomes D6+2 at half range.",
    when: "Always enable 'Half range' when modeling Melta at close range — the bonus is flat, not a dice roll, so it's always worth it. A Melta 2 weapon with D3 damage becomes D3+2, dramatically increasing minimum and average damage. Essential for vehicle hunting.",
    implemented: true,
  },
  {
    type: 'ANTI', label: 'Anti', group: 'wound',
    special: 'anti',
    tip: 'Crits against specific keyword on Y+',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon against a target that has the specified keyword, an unmodified Wound roll of X+ scores a Critical Wound.",
    note: "No change confirmed for V11. Lowers the Critical Wound threshold against specific targets. Pairs with Devastating Wounds to inflict mortal wounds more reliably.",
    when: "Set the roll threshold to match the weapon profile (e.g. Anti-MONSTER 4+). Against the correct target type, this dramatically increases critical wound frequency. Paired with Devastating Wounds, it turns a weapon into a reliable mortal wound generator.",
    implemented: true,
  },

  // ── Save / Defender phase ─────────────────────────────────────────────────

  {
    type: 'INVULNERABLE_SAVE', label: 'Invulnerable Save', group: 'save',
    tip: 'Ignore AP — fixed save unaffected by armour penetration',
    phase: 'Saving Throw',
    rule: "Some models have an invulnerable saving throw (e.g. 4++). Each time an attack is allocated to such a model, the saving throw can use this value instead of the model's normal armour save. Invulnerable saves are never modified by a weapon's AP characteristic.",
    note: "No change confirmed for V11. Configured via the DefenderPanel 'Invuln' input. The engine always picks the most favourable save — the lower of the AP-modified armour save and the invulnerable save.",
    when: "Most impactful when the weapon's AP is high enough to strip the armour save. AP-3 vs a 3+ save degrades armour to 6+, but a 4++ stays at 4+ regardless. Always set the invuln value in the DefenderPanel when the target unit has one — the difference can be huge against dedicated anti-tank or elite-busting weapons.",
    implemented: true,
  },
  {
    type: 'FEEL_NO_PAIN', label: 'Feel No Pain', group: 'save',
    tip: 'After a failed save, roll X+ per damage point to ignore it',
    phase: 'After Saving Throw',
    rule: "Some models have a Feel No Pain characteristic (e.g. 5+). Each time an attack is allocated to such a model and a saving throw is failed, roll one D6 per point of damage suffered: on a result equal to or greater than the Feel No Pain value, that damage point is ignored.",
    note: "No change confirmed for V11. Configured via the DefenderPanel 'FNP' input. The engine rolls one FNP die per damage point, independently of saves. FNP also applies to mortal wounds — Devastating Wounds crits still go through FNP.",
    when: "Most effective against high-damage-per-hit weapons (D2, D3+). Each successful FNP roll negates one damage point, so FNP effectively adds virtual wounds. A 5+ FNP saves roughly 33% of all damage on average — a W3 model with FNP 5+ has an effective HP of ~4.5. Always factor it in when estimating whether a target survives a volley.",
    implemented: true,
  },
  {
    type: 'DAMAGE_REDUCTION', label: 'Damage Reduction', group: 'save',
    tip: '−1 to each unsaved wound\'s damage (min 1)',
    phase: 'Damage',
    rule: "Some abilities (e.g. Armour of Contempt, Transhuman Physiology) reduce the Damage characteristic of attacks targeting the model by 1, to a minimum of 1. This applies after all saving throws, to each unsaved wound individually.",
    note: "No change confirmed for V11. Configured via the DefenderPanel 'Dmg −1' toggle. The reduction applies per unsaved wound before any FNP roll. No effect on D1 weapons — minimum 1 means no reduction. Against variable damage (D3, D6+), it cuts both average and variance.",
    when: "Most impactful against D2 weapons — damage reduction halves output exactly since every hit deals 1 instead of 2. Against D1 weapons it has zero mathematical effect. Enable the toggle whenever the target has an ability that reduces incoming damage — Armour of Contempt on Space Marines is the most common example in competitive play.",
    implemented: true,
  },

  // ── Other ──────────────────────────────────────────────────────────────────

  {
    type: 'BLAST', label: 'Blast', group: 'hit',
    tip: '+1 attack per weapon per 5 defender models',
    phase: 'Number of Attacks',
    rule: "Add 1 to the Attacks characteristic of this weapon for every 5 models in the target unit (rounding down). Each model in the attacking unit benefits individually.",
    note: "No change confirmed for V11. Applied per weapon before hit rolls. 5 Hellblasters vs 20 Boyz: each Plasma Incinerator goes from A2 to A6 → 5×6 = 30 attacks (vs 10 base). Stacks with Rapid Fire. See also Cleave, its melee equivalent, new in V11.",
    when: "Set 'Number of targets' to reflect the full squad size. Against 20 models each weapon gains +4 attacks — a 5-model unit multiplies that into +20 total attacks.",
    implemented: true,
  },
  {
    type: 'CLEAVE', label: 'Cleave', group: 'hit',
    valued: true, default: '1',
    tip: 'Melee Blast — +X attacks per 5 models in target unit',
    phase: 'Number of Attacks',
    rule: "This ability always takes the form [CLEAVE X]. Each time you gather attack dice for a [CLEAVE] weapon, if you only selected one target for all of that weapon's attacks, add X additional attack dice for every five models that were in the target unit in the Select Targets step (rounding down).",
    note: "NEW IN V11. The melee equivalent of Blast — confirmed identical in formula via the community dataset's rule text, and seen in live use (Ork 'Two-handed big choppa', tagged Cleave 1). Requires a single target for the whole attack, same restriction as Blast. Implemented in simulation_v11.js — literally the same +floor(models/5) bonus as Blast, added into the attack count in Phase 1.",
    when: "Set 'Number of targets' to the full size of the enemy unit you're charging, same reasoning as Blast — large blobs get hit by proportionally more attack dice.",
    implemented: true,
  },
  {
    type: 'PRECISION', label: 'Precision', group: 'other',
    tip: 'Can allocate to character',
    phase: 'Wound Allocation',
    rule: "Each time an attack made with this weapon successfully wounds an Attached unit, if a Critical Hit was scored, the attacking player can choose to allocate the attack to a Character model.",
    note: "No change confirmed for V11. Not simulated — wound allocation to characters requires tracking model composition, which is out of scope for this engine.",
    when: "Used to snipe Characters hiding within attached units. The simulator doesn't track unit composition or character targeting, so Precision has no simulation effect.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'HAZARDOUS', label: 'Hazardous', group: 'other',
    tip: 'Risk to own models',
    phase: 'After Shooting / Fighting',
    rule: "After a unit shoots or fights, for each Hazardous weapon used by a model in that unit, roll one D6. On a 1 (per V10 rules — see note for the V11 threshold), that model suffers 3 mortal wounds.",
    note: "POSSIBLY CHANGED FOR V11, NOT YET CONFIRMED. Early blog/video coverage claims the fail threshold widens from 1 to 1-or-2 (33% fail rate instead of 17%), but the community dataset's own rule text just references an external 'hazard rolls' rules section without giving the numeric threshold — so this isn't confirmed against real V11 data yet. Not simulated either way — self-inflicted damage is out of scope for this engine.",
    when: "Represents the risk of using powerful weapons that can harm the bearer. The simulator only models damage dealt to the enemy — self-inflicted Hazardous wounds are outside its scope.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'PSYCHIC', label: 'Psychic', group: 'other',
    tip: 'Ignores BS/WS and Hit roll modifiers',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with a [PSYCHIC] weapon, you can ignore any or all modifiers to that attack's BS or WS characteristic, and any or all modifiers to the Hit roll. Attacks made this way are known as psychic attacks.",
    note: "CHANGED FOR V11 (confirmed via the community dataset's rule text). In V10, Psychic weapons function exactly like normal weapons. In V11, Psychic becomes a real mechanical effect — but note it only cancels Hit-phase modifiers (BS/WS and the Hit roll itself), NOT Wound roll modifiers. An earlier blog/video summary claimed it ignored both; the actual rule text found in the data only supports the Hit-phase claim, so treat the Wound-phase part as unconfirmed/likely incorrect. Implemented in simulation_v11.js: negative Hit-roll modifiers (Cover, Indirect Fire, a defender's hit-roll debuff) are ignored, positive ones (Heavy) still apply, and Wound roll modifiers are untouched.",
    when: "Most useful when the target would otherwise apply a Hit-roll penalty — V11's new Cover malus (-1 BS), Indirect Fire, or a defensive stratagem/ability. Psychic attacks bypass all of it.",
    implemented: true,
  },

  // ── Ability section ────────────────────────────────────────────────────────
  // Shown in AbilitiesSection (not in keyword chip picker).

  {
    type: 'EXTRA_ATTACKS', label: 'Extra Attacks', group: 'ability',
    valued: true, default: '1',
    tip: 'X bonus attacks with this weapon',
    phase: 'Shooting / Fight Phase',
    rule: "The bearer can make X additional attacks with this weapon on top of its normal attacks.",
    note: "No change confirmed for V11. Unlike other weapons, Extra Attacks weapons do not replace the model's other attacks — they are bonus attacks.",
    when: "Use to model ability-granted bonus attacks (army rules, stratagems, unit abilities). The bonus attacks go through the same hit/wound/save sequence as normal attacks.",
    implemented: true,
  },
  {
    type: 'CRITICAL_HIT_ON', label: 'Crit Hit On', group: 'ability',
    valued: true, default: '5',
    tip: 'Lower the crit threshold to X+',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, a Critical Hit is scored on an unmodified Hit roll of X+ instead of only on a 6.",
    note: "No change confirmed for V11. Interacts with Sustained Hits and Lethal Hits — lowering the critical threshold makes those abilities trigger more often.",
    when: "The multiplier for crit-dependent keywords. At 5+, criticals occur on 2 out of 6 dice instead of 1 — a 100% increase. Essential to enable the full potential of Sustained Hits, Lethal Hits, or Devastating Wounds. Stack all three for maximum effect.",
    implemented: true,
  },
  {
    type: 'IGNORES_COVER', label: 'Ignores Cover', group: 'ability',
    tip: 'Target cannot claim cover bonus',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, the target cannot claim the Benefit of Cover against that attack.",
    note: "CHANGED CONTEXT FOR V11 (see Cover in V11_CHANGES.md — not yet its own page entry here). Cover no longer grants +1 to the save; instead it subtracts 1 from the attacker's Hit roll. Implemented in simulation_v11.js: Ignores Cover now cancels that Hit-roll malus instead of a save bonus — same role (negates Cover), different phase. Monsters/Vehicles reportedly no longer benefiting from Cover at all is still unconfirmed by the rule text and NOT modeled — Cover applies universally in the engine regardless of target keywords, same as V10.",
    when: "Enable whenever the target has cover — from terrain or from an Indirect Fire shot. In V11, this cancels a -1 Hit-roll malus on the attacker rather than improving the target's save.",
    implemented: true,
  },
  {
    type: 'SET_ROLL_TO_6', label: 'Set Die → 6', group: 'ability',
    tip: 'Once per phase, change one hit/wound/damage die to an unmodified 6',
    phase: 'Any',
    rule: "Once per phase, you can change the result of one Hit roll, one Wound roll, or one Damage roll made for a model in that unit to an unmodified 6.",
    note: "No change confirmed for V11. Simulated as one free wound roll with result 6 (optimal use case — a 6 always wounds and is a critical wound). If Devastating Wounds is active, the wound becomes a mortal wound and bypasses saves.",
    when: "Most impactful against high-Toughness targets (guaranteed wound regardless of Strength) or when Devastating Wounds is active (free mortal wound). Against targets with poor saves, the guaranteed wound that still needs a save is usually less impactful than using it on a damage roll for max damage.",
    implemented: true,
  },
  {
    type: 'FIRE_OVERWATCH', label: 'Fire Overwatch', group: 'ability',
    valued: true, default: '6',
    tip: 'Only unmodified X+ hits — shoot in the opponent\'s turn',
    phase: 'Hit Roll',
    rule: "Each time a model in your unit makes a ranged attack, an unmodified Hit roll of X+ is required to score a hit, irrespective of the attacking weapon's Ballistic Skill or any modifiers.",
    note: "No change confirmed for V11. All BS modifiers, re-roll bonuses, and hit penalties are irrelevant — only a natural roll of X+ succeeds. Standard Overwatch requires 6+; some abilities (e.g. Tau Sept) allow 5+. Critical hit abilities still trigger on hits scored this way.",
    when: "Use to model Overwatch fire (Stratagem, 1 CP) when the enemy declares a charge or moves within range. Standard (6+): expect 1/6th of normal hit rate. Enhanced (5+): expect 2/6th — significantly stronger.",
    implemented: true,
  },
]

// Lookup by type — used by SimulatorPage for the hover definition panel
export const KEYWORD_BY_TYPE_V11 = Object.fromEntries(
  KEYWORD_REGISTRY_V11.map((k) => [k.type, k])
)

// Grouped for the keyword chip picker (excludes the 'ability' group)
export const KW_GROUPS_V11 = [
  { label: 'Hit phase',   keys: KEYWORD_REGISTRY_V11.filter((k) => k.group === 'hit')   },
  { label: 'Wound phase', keys: KEYWORD_REGISTRY_V11.filter((k) => k.group === 'wound') },
  { label: 'Other',       keys: KEYWORD_REGISTRY_V11.filter((k) => k.group === 'other') },
]
