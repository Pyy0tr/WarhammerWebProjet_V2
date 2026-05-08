/**
 * engine/keywords.js
 * Single source of truth for weapon keyword metadata.
 * To add a keyword: add one entry here, then implement in simulation.js.
 *
 * Entry shape:
 *   type        — engine identifier (SCREAMING_SNAKE_CASE)
 *   label       — display name in UI
 *   group       — 'hit' | 'wound' | 'other' | 'ability'
 *                 'ability' = shown in AbilitiesSection, not in chip picker
 *   tip         — short tooltip on hover
 *   phase       — WH40K phase name shown in definition panel
 *   rule        — official rule text
 *   note        — implementation note / caveats
 *   valued      — true if the keyword requires a numeric value (e.g. "Sustained Hits 2")
 *   default     — default value string when valued=true
 *   special     — 'anti' for the Anti-[KEYWORD] X+ special input
 *   implemented — false if the engine silently ignores this keyword
 *   notSimulated — true = UI shows it but simulation has no effect (user-facing note in hover panel)
 */

export const KEYWORD_REGISTRY = [

  // ── Hit phase ──────────────────────────────────────────────────────────────

  {
    type: 'TORRENT', label: 'Torrent', group: 'hit',
    tip: 'Auto-hit, no roll needed',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, that attack automatically hits the target. No Hit roll is made.",
    note: "Torrent weapons bypass Ballistic Skill entirely — they always hit regardless of modifiers, cover, or penalties.",
    when: "Use when BS is poor or you face to-hit penalties. Every attack lands — ideal for template weapons and flamers where missing would waste the high attack count.",
    implemented: true,
  },
  {
    type: 'LETHAL_HITS', label: 'Lethal Hits', group: 'hit',
    tip: 'Critical hit → auto-wound (save still applies)',
    phase: 'Hit Roll → Wound Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Hit is scored, that attack automatically wounds the target.",
    note: "The wound roll is skipped — the attack goes directly to saves at full AP and Damage. Saves still apply. Pairs powerfully with Critical Hit On X+ to generate more auto-wounds.",
    when: "Most effective against high-Toughness targets where the wound roll is the main bottleneck (needing 5+ or 6+). Combine with Crit Hit On 5+ to increase critical frequency and auto-wound more reliably.",
    implemented: true,
  },
  {
    type: 'SUSTAINED_HITS', label: 'Sustained Hits', group: 'hit',
    valued: true, default: '1',
    tip: 'Crit → X extra hit rolls',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Hit is scored, that hit scores X additional hits on the target. The additional hits are not Critical Hits and cannot themselves generate Sustained Hits.",
    note: "The extra hits roll to wound normally and benefit from re-roll abilities. No cascade — extra hits do not trigger further Sustained Hits.",
    when: "Scales with attack volume — more dice means more critical opportunities. Pair with Crit Hit On 5+ to generate extra hits on 1 in 3 dice instead of 1 in 6. Best on units that unload many attacks in a single activation.",
    implemented: true,
  },
  {
    type: 'HEAVY', label: 'Heavy', group: 'hit',
    tip: "+1 to hit if attacker didn't move",
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, if the attacking model's unit Remained Stationary this turn, add 1 to that attack's Hit roll.",
    note: "The +1 is applied after the roll and does not affect whether a roll is a Critical Hit (which is always based on the unmodified roll). Enable 'Remained stationary' in context.",
    when: "Enable 'Remained Stationary' in the simulator context whenever your unit held its position. It's a free improvement — if you planned to stay still, there's no reason not to toggle it.",
    implemented: true,
  },
  {
    type: 'ASSAULT', label: 'Assault', group: 'hit',
    tip: 'No penalty for advancing',
    phase: 'Shooting Phase',
    rule: "This weapon can be fired even if the bearer's unit Advanced this turn. If it did, subtract 1 from the Hit roll unless the weapon also has the Torrent ability.",
    note: "Not simulated — the advancing state is not tracked by this engine. Selecting Assault has no effect on simulation results.",
    when: "Relevant when your unit Advances and shoots in the same turn. Because the advancing state isn't tracked in this simulator, enabling Assault has no effect on the numbers.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'RAPID_FIRE', label: 'Rapid Fire', group: 'hit',
    valued: true, default: '1',
    tip: '+X attacks at half range',
    phase: 'Shooting Phase',
    rule: "Each time the bearer's unit is selected to shoot, if the target is within half the weapon's range, the Attacks characteristic is increased by X.",
    note: "Enable 'Half range' in context to activate the extra attacks. Stacks with Blast.",
    when: "Enable 'Half range' whenever your models are within half the weapon's range. The bonus scales with model count — a 5-model unit with Rapid Fire 1 gains 5 extra attacks. Stacks with Blast for massive attack pools.",
    implemented: true,
  },
  {
    type: 'INDIRECT_FIRE', label: 'Indirect Fire', group: 'hit',
    tip: '-1 to hit if target not visible',
    phase: 'Hit Roll',
    rule: "This weapon can target and make attacks against units that are not visible to the attacking model. If the target is not visible, subtract 1 from the Hit roll and the target is treated as having the Benefit of Cover.",
    note: "Enable 'Target not visible' in context. Even if the target is in the open, it gains cover when hit indirectly.",
    when: "Enable 'Target not visible' to model indirect fire. Remember that the target automatically gains the Benefit of Cover, even if it's standing in the open — factor this into your save calculations.",
    implemented: true,
  },
  {
    type: 'PISTOL', label: 'Pistol', group: 'hit',
    tip: 'Can shoot in engagement range',
    phase: 'Shooting Phase',
    rule: "This weapon can be selected to shoot with even if the bearer's unit is within Engagement Range of one or more enemy units.",
    note: "Not simulated — engagement range is a positional constraint not tracked by this engine. Selecting Pistol has no effect on simulation results.",
    when: "Relevant when your unit is locked in melee and wants to shoot. The simulator doesn't track engagement range, so enabling Pistol doesn't change results.",
    implemented: false, notSimulated: true,
  },

  // ── Wound phase ────────────────────────────────────────────────────────────

  {
    type: 'TWIN_LINKED', label: 'Twin-linked', group: 'wound',
    tip: 'Re-roll all wound rolls',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, you can re-roll the Wound roll.",
    note: "Applies to every wound roll, not just failures. A full re-roll, not limited to results of 1.",
    when: "Strongest on high-damage weapons (D3, D6+) where a failed wound roll wastes the most. Also valuable when wounding requires a 5+ or 6+ — the re-roll nearly doubles your successful wound rate in those cases.",
    implemented: true,
  },
  {
    type: 'DEVASTATING_WOUNDS', label: 'Dev. Wounds', group: 'wound',
    tip: 'Critical wound → mortal wounds = damage',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Wound is scored, the target suffers Mortal Wounds equal to the Damage characteristic. The attack sequence ends — no saving throw is made.",
    note: "Mortal wounds bypass armour and invulnerable saves entirely. Critical Wounds are scored on unmodified Wound rolls of 6.",
    when: "Most impactful against heavily armored targets (2+ saves, strong invulnerable saves) where normal damage would be saved. Pair with ANTI X+ to lower the critical wound threshold from 6+ to 4+ or 5+, massively increasing mortal wound output.",
    implemented: true,
  },
  {
    type: 'LANCE', label: 'Lance', group: 'wound',
    tip: '+1 to wound if attacker charged',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, if the bearer's unit made a Charge move this turn, add 1 to that attack's Wound roll.",
    note: "Like Heavy, the +1 is applied after the roll and does not affect whether a wound is Critical (unmodified 6 only). Enable 'Attacker charged' in context.",
    when: "Enable 'Attacker charged' on the turn your unit charges. Particularly valuable when your Strength only barely wounds the target — Lance can shift the wound roll from 5+ to 4+, nearly doubling your wound rate.",
    implemented: true,
  },
  {
    type: 'MELTA', label: 'Melta', group: 'wound',
    valued: true, default: '2',
    tip: '+X damage at half range',
    phase: 'Damage',
    rule: "Each time an attack is made with this weapon, if the target is within half this weapon's range, increase the Damage characteristic of that attack by X.",
    note: "Enable 'Half range' in context to activate the bonus damage. A Melta 2 weapon with D6 damage becomes D6+2 at half range.",
    when: "Always enable 'Half range' when modeling Melta at close range — the bonus is flat, not a dice roll, so it's always worth it. A Melta 2 weapon with D3 damage becomes D3+2, dramatically increasing minimum and average damage. Essential for vehicle hunting.",
    implemented: true,
  },
  {
    type: 'ANTI', label: 'Anti', group: 'wound',
    special: 'anti',
    tip: 'Crits against specific keyword on Y+',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon against a target that has the specified keyword, an unmodified Wound roll of X+ scores a Critical Wound.",
    note: "Lowers the Critical Wound threshold against specific targets. Pairs with Devastating Wounds to inflict mortal wounds more reliably.",
    when: "Set the roll threshold to match the weapon profile (e.g. Anti-MONSTER 4+). Against the correct target type, this dramatically increases critical wound frequency. Paired with Devastating Wounds, it turns a weapon into a reliable mortal wound generator.",
    implemented: true,
  },

  // ── Other ──────────────────────────────────────────────────────────────────

  {
    type: 'BLAST', label: 'Blast', group: 'hit',
    tip: '+1 attack per weapon per 5 defender models',
    phase: 'Number of Attacks',
    rule: "Add 1 to the Attacks characteristic of this weapon for every 5 models in the target unit (rounding down). Each model in the attacking unit benefits individually.",
    note: "Applied per weapon before hit rolls. 5 Hellblasters vs 20 Boyz: each Plasma Incinerator goes from A2 to A6 → 5×6 = 30 attacks (vs 10 base). Stacks with Rapid Fire.",
    when: "Set 'Number of targets' to reflect the full squad size. Against 20 models each weapon gains +4 attacks — a 5-model unit multiplies that into +20 total attacks.",
    implemented: true,
  },
  {
    type: 'PRECISION', label: 'Precision', group: 'other',
    tip: 'Can allocate to character',
    phase: 'Wound Allocation',
    rule: "Each time an attack made with this weapon successfully wounds an Attached unit, if a Critical Hit was scored, the attacking player can choose to allocate the attack to a Character model.",
    note: "Not simulated — wound allocation to characters requires tracking model composition, which is out of scope for this engine.",
    when: "Used to snipe Characters hiding within attached units. The simulator doesn't track unit composition or character targeting, so Precision has no simulation effect.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'HAZARDOUS', label: 'Hazardous', group: 'other',
    tip: 'Risk to own models',
    phase: 'After Shooting / Fighting',
    rule: "After a unit shoots or fights, for each Hazardous weapon used by a model in that unit, roll one D6. On a 1, that model suffers 3 mortal wounds.",
    note: "Not simulated — self-inflicted damage is not tracked. Selecting Hazardous has no effect on simulation results.",
    when: "Represents the risk of using powerful weapons that can harm the bearer. The simulator only models damage dealt to the enemy — self-inflicted Hazardous wounds are outside its scope.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'PSYCHIC', label: 'Psychic', group: 'other',
    tip: 'Psychic weapon',
    phase: 'Shooting Phase',
    rule: "This is a Psychic weapon. All normal rules for ranged weapons apply.",
    note: "In 10th Edition, Psychic weapons function like normal weapons. Some army-specific abilities interact with Psychic attacks but are not modeled here.",
    when: "In 10th Edition, Psychic weapons use all standard ranged rules. Enable it for accurate keyword representation, but don't expect any change in simulation output — the engine treats it identically to a non-Psychic weapon.",
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
    note: "Unlike other weapons, Extra Attacks weapons do not replace the model's other attacks — they are bonus attacks.",
    when: "Use to model ability-granted bonus attacks (army rules, stratagems, unit abilities). The bonus attacks go through the same hit/wound/save sequence as normal attacks.",
    implemented: true,
  },
  {
    type: 'CRITICAL_HIT_ON', label: 'Crit Hit On', group: 'ability',
    valued: true, default: '5',
    tip: 'Lower the crit threshold to X+',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, a Critical Hit is scored on an unmodified Hit roll of X+ instead of only on a 6.",
    note: "Interacts with Sustained Hits and Lethal Hits — lowering the critical threshold makes those abilities trigger more often.",
    when: "The multiplier for crit-dependent keywords. At 5+, criticals occur on 2 out of 6 dice instead of 1 — a 100% increase. Essential to enable the full potential of Sustained Hits, Lethal Hits, or Devastating Wounds. Stack all three for maximum effect.",
    implemented: true,
  },
  {
    type: 'IGNORES_COVER', label: 'Ignores Cover', group: 'ability',
    tip: 'Target cannot claim cover bonus',
    phase: 'Saving Throw',
    rule: "Each time an attack is made with this weapon, the target cannot claim the Benefit of Cover against that attack.",
    note: "Cover normally adds +1 to the saving throw. This ability negates that bonus entirely.",
    when: "Enable whenever the target has cover — from terrain or from an Indirect Fire shot. Negating a +1 save is worth roughly the same as increasing AP by 1. Particularly valuable vs targets with a naturally high save who rely on cover to reach 2+ or 1+.",
    implemented: true,
  },
  {
    type: 'FIRE_OVERWATCH', label: 'Fire Overwatch', group: 'ability',
    tip: 'Only unmodified 6s hit — shoot in the opponent\'s turn',
    phase: 'Hit Roll',
    rule: "Each time a model in your unit makes a ranged attack, an unmodified Hit roll of 6 is required to score a hit, irrespective of the attacking weapon's Ballistic Skill or any modifiers.",
    note: "All BS modifiers, re-roll bonuses, and hit penalties are irrelevant to whether the attack scores a hit — only a natural 6 succeeds. Critical hit abilities (Sustained Hits, Lethal Hits) still trigger on hits scored this way.",
    when: "Use to model Overwatch fire (Stratagem, 1 CP) when the enemy declares a charge or moves within range. Expect roughly 1/6th the normal hit rate regardless of how skilled the shooter is.",
    implemented: true,
  },
]

// Lookup by type — used by SimulatorPage for the hover definition panel
export const KEYWORD_BY_TYPE = Object.fromEntries(
  KEYWORD_REGISTRY.map((k) => [k.type, k])
)

// Grouped for the keyword chip picker (excludes the 'ability' group)
export const KW_GROUPS = [
  { label: 'Hit phase',   keys: KEYWORD_REGISTRY.filter((k) => k.group === 'hit')   },
  { label: 'Wound phase', keys: KEYWORD_REGISTRY.filter((k) => k.group === 'wound') },
  { label: 'Other',       keys: KEYWORD_REGISTRY.filter((k) => k.group === 'other') },
]

// Non-valued, non-special keyword types — used by mapKeywords() to parse BSData keyword strings
export const SIMPLE_KW_TYPES = KEYWORD_REGISTRY
  .filter((k) => !k.valued && !k.special)
  .map((k) => k.type)
