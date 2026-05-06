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
    implemented: true,
  },
  {
    type: 'LETHAL_HITS', label: 'Lethal Hits', group: 'hit',
    tip: 'Critical hit → auto-wound (save still applies)',
    phase: 'Hit Roll → Wound Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Hit is scored, that attack automatically wounds the target.",
    note: "The wound roll is skipped — the attack goes directly to saves at full AP and Damage. Saves still apply. Pairs powerfully with Critical Hit On X+ to generate more auto-wounds.",
    implemented: true,
  },
  {
    type: 'SUSTAINED_HITS', label: 'Sustained Hits', group: 'hit',
    valued: true, default: '1',
    tip: 'Crit → X extra hit rolls',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Hit is scored, that hit scores X additional hits on the target. The additional hits are not Critical Hits and cannot themselves generate Sustained Hits.",
    note: "The extra hits roll to wound normally and benefit from re-roll abilities. No cascade — extra hits do not trigger further Sustained Hits.",
    implemented: true,
  },
  {
    type: 'HEAVY', label: 'Heavy', group: 'hit',
    tip: "+1 to hit if attacker didn't move",
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, if the attacking model's unit Remained Stationary this turn, add 1 to that attack's Hit roll.",
    note: "The +1 is applied after the roll and does not affect whether a roll is a Critical Hit (which is always based on the unmodified roll). Enable 'Remained stationary' in context.",
    implemented: true,
  },
  {
    type: 'ASSAULT', label: 'Assault', group: 'hit',
    tip: 'No penalty for advancing',
    phase: 'Shooting Phase',
    rule: "This weapon can be fired even if the bearer's unit Advanced this turn. If it did, subtract 1 from the Hit roll unless the weapon also has the Torrent ability.",
    note: "Not simulated — the advancing state is not tracked by this engine. Selecting Assault has no effect on simulation results.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'RAPID_FIRE', label: 'Rapid Fire', group: 'hit',
    valued: true, default: '1',
    tip: '+X attacks at half range',
    phase: 'Shooting Phase',
    rule: "Each time the bearer's unit is selected to shoot, if the target is within half the weapon's range, the Attacks characteristic is increased by X.",
    note: "Enable 'Half range' in context to activate the extra attacks. Stacks with Blast.",
    implemented: true,
  },
  {
    type: 'INDIRECT_FIRE', label: 'Indirect Fire', group: 'hit',
    tip: '-1 to hit if target not visible',
    phase: 'Hit Roll',
    rule: "This weapon can target and make attacks against units that are not visible to the attacking model. If the target is not visible, subtract 1 from the Hit roll and the target is treated as having the Benefit of Cover.",
    note: "Enable 'Target not visible' in context. Even if the target is in the open, it gains cover when hit indirectly.",
    implemented: true,
  },
  {
    type: 'PISTOL', label: 'Pistol', group: 'hit',
    tip: 'Can shoot in engagement range',
    phase: 'Shooting Phase',
    rule: "This weapon can be selected to shoot with even if the bearer's unit is within Engagement Range of one or more enemy units.",
    note: "Not simulated — engagement range is a positional constraint not tracked by this engine. Selecting Pistol has no effect on simulation results.",
    implemented: false, notSimulated: true,
  },

  // ── Wound phase ────────────────────────────────────────────────────────────

  {
    type: 'TWIN_LINKED', label: 'Twin-linked', group: 'wound',
    tip: 'Re-roll all wound rolls',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, you can re-roll the Wound roll.",
    note: "Applies to every wound roll, not just failures. A full re-roll, not limited to results of 1.",
    implemented: true,
  },
  {
    type: 'DEVASTATING_WOUNDS', label: 'Dev. Wounds', group: 'wound',
    tip: 'Critical wound → mortal wounds = damage',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, if a Critical Wound is scored, the target suffers Mortal Wounds equal to the Damage characteristic. The attack sequence ends — no saving throw is made.",
    note: "Mortal wounds bypass armour and invulnerable saves entirely. Critical Wounds are scored on unmodified Wound rolls of 6.",
    implemented: true,
  },
  {
    type: 'LANCE', label: 'Lance', group: 'wound',
    tip: '+1 to wound if attacker charged',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon, if the bearer's unit made a Charge move this turn, add 1 to that attack's Wound roll.",
    note: "Like Heavy, the +1 is applied after the roll and does not affect whether a wound is Critical (unmodified 6 only). Enable 'Attacker charged' in context.",
    implemented: true,
  },
  {
    type: 'MELTA', label: 'Melta', group: 'wound',
    valued: true, default: '2',
    tip: '+X damage at half range',
    phase: 'Damage',
    rule: "Each time an attack is made with this weapon, if the target is within half this weapon's range, increase the Damage characteristic of that attack by X.",
    note: "Enable 'Half range' in context to activate the bonus damage. A Melta 2 weapon with D6 damage becomes D6+2 at half range.",
    implemented: true,
  },
  {
    type: 'ANTI', label: 'Anti', group: 'wound',
    special: 'anti',
    tip: 'Crits against specific keyword on Y+',
    phase: 'Wound Roll',
    rule: "Each time an attack is made with this weapon against a target that has the specified keyword, an unmodified Wound roll of X+ scores a Critical Wound.",
    note: "Lowers the Critical Wound threshold against specific targets. Pairs with Devastating Wounds to inflict mortal wounds more reliably.",
    implemented: true,
  },

  // ── Other ──────────────────────────────────────────────────────────────────

  {
    type: 'BLAST', label: 'Blast', group: 'other',
    tip: '+1 attack per 5 defender models',
    phase: 'Number of Attacks',
    rule: "Add 1 to the Attacks characteristic of this weapon for every 5 models in the target unit (rounding down).",
    note: "A unit of 11 models adds +2 attacks. Applied before rolling random attacks.",
    implemented: true,
  },
  {
    type: 'PRECISION', label: 'Precision', group: 'other',
    tip: 'Can allocate to character',
    phase: 'Wound Allocation',
    rule: "Each time an attack made with this weapon successfully wounds an Attached unit, if a Critical Hit was scored, the attacking player can choose to allocate the attack to a Character model.",
    note: "Not simulated — wound allocation to characters requires tracking model composition, which is out of scope for this engine.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'HAZARDOUS', label: 'Hazardous', group: 'other',
    tip: 'Risk to own models',
    phase: 'After Shooting / Fighting',
    rule: "After a unit shoots or fights, for each Hazardous weapon used by a model in that unit, roll one D6. On a 1, that model suffers 3 mortal wounds.",
    note: "Not simulated — self-inflicted damage is not tracked. Selecting Hazardous has no effect on simulation results.",
    implemented: false, notSimulated: true,
  },
  {
    type: 'PSYCHIC', label: 'Psychic', group: 'other',
    tip: 'Psychic weapon',
    phase: 'Shooting Phase',
    rule: "This is a Psychic weapon. All normal rules for ranged weapons apply.",
    note: "In 10th Edition, Psychic weapons function like normal weapons. Some army-specific abilities interact with Psychic attacks but are not modeled here.",
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
    implemented: true,
  },
  {
    type: 'CRITICAL_HIT_ON', label: 'Crit Hit On', group: 'ability',
    valued: true, default: '5',
    tip: 'Lower the crit threshold to X+',
    phase: 'Hit Roll',
    rule: "Each time an attack is made with this weapon, a Critical Hit is scored on an unmodified Hit roll of X+ instead of only on a 6.",
    note: "Interacts with Sustained Hits and Lethal Hits — lowering the critical threshold makes those abilities trigger more often.",
    implemented: true,
  },
  {
    type: 'IGNORES_COVER', label: 'Ignores Cover', group: 'ability',
    tip: 'Target cannot claim cover bonus',
    phase: 'Saving Throw',
    rule: "Each time an attack is made with this weapon, the target cannot claim the Benefit of Cover against that attack.",
    note: "Cover normally adds +1 to the saving throw. This ability negates that bonus entirely.",
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
