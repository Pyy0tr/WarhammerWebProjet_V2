import { useState, useRef, useEffect } from 'react'
import { useSimulatorStore } from '../store/simulatorStore'
import { AttackerPanel } from '../components/AttackerPanel'
import { DefenderPanel } from '../components/DefenderPanel'
import { ResultsPanel } from '../components/ResultsPanel'
import { AbilityText } from '../components/AbilityText'
import { ACCENT, ACCENT_H, BG, SURFACE, SURFACE_E, BORDER, TEXT, TEXT_SEC, TEXT_WEAK, TEXT_OFF, ERROR } from '../theme'

// ── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Attack' },
  { n: 2, label: 'Review' },
  { n: 3, label: 'Defender' },
  { n: 4, label: 'Results' },
]

function StepBar({ current, onStep }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0',
      padding: '0 48px', borderBottom: `1px solid ${BORDER}`,
    }}>
      {STEPS.map((s) => {
        const active    = s.n === current
        const completed = s.n < current
        const clickable = s.n < current || (s.n === 2 && current === 1)
        return (
          <button
            key={s.n}
            onClick={() => clickable && onStep(s.n)}
            style={{
              flex: 1, padding: '14px 0 12px',
              background: 'none', border: 'none',
              borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
              cursor: clickable ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'border-color 150ms',
            }}
          >
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? ACCENT : completed ? SURFACE_E : 'transparent',
              border: `1px solid ${active || completed ? ACCENT : BORDER}`,
              fontFamily: 'Space Mono, monospace', fontSize: '9px', fontWeight: 700,
              color: active ? BG : completed ? ACCENT : TEXT_OFF,
              transition: 'all 150ms',
            }}>
              {completed ? '\u2713' : s.n}
            </span>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              color: active ? ACCENT : completed ? TEXT_SEC : TEXT_OFF,
              fontWeight: active ? 700 : 400,
              transition: 'color 150ms',
            }}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Attack summary card ──────────────────────────────────────────────────────

function AttackCard({ attack, idx, onEdit, onRemove }) {
  const w = attack.weapon
  const kwList = (w.keywords ?? []).map((k) => {
    if (k.type === 'ANTI') return `Anti-${k.target} ${k.threshold}+`
    if (k.value !== undefined) return `${k.type.replace(/_/g, ' ')} ${k.value}`
    return k.type.replace(/_/g, ' ')
  })

  return (
    <div style={{
      border: `1px solid ${BORDER}`, padding: '14px 16px',
      background: SURFACE, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '1.5px', color: TEXT_OFF,
          }}>
            #{idx + 1}
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: '12px',
            fontWeight: 700, color: ACCENT,
          }}>
            {w.name || 'Custom weapon'}
          </span>
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: '10px',
          color: TEXT_SEC, letterSpacing: '0.5px',
        }}>
          {attack.models}x &middot; A{w.attacks} &middot; BS{w.skill}+ &middot; S{w.strength} &middot; AP{w.ap} &middot; D{w.damage}
        </div>
        {kwList.length > 0 && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            color: TEXT_WEAK, marginTop: '4px', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            {kwList.join(' \u00b7 ')}
          </div>
        )}
        {attack.buffs?.length > 0 && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            color: 'rgba(194,143,133,0.7)', marginTop: '3px', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            {attack.buffs.map((b) => `${b.type.replace(/_/g, ' ')} (${b.value})`).join(' \u00b7 ')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
        <button
          onClick={() => onEdit(idx)}
          style={{
            background: 'none', border: `1px solid ${BORDER}`,
            color: ACCENT, fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px',
            cursor: 'pointer', transition: 'border-color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER }}
        >
          Edit
        </button>
        <button
          onClick={() => onRemove(idx)}
          style={{
            background: 'none', border: `1px solid rgba(255,92,122,0.3)`,
            color: ERROR, fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 8px',
            cursor: 'pointer', transition: 'border-color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = ERROR }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,92,122,0.3)' }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── Step 2: Review attacks ───────────────────────────────────────────────────

function ReviewStep() {
  const attacks      = useSimulatorStore((s) => s.attacks)
  const setStep      = useSimulatorStore((s) => s.setStep)
  const editAttack   = useSimulatorStore((s) => s.editAttack)
  const removeAttack = useSimulatorStore((s) => s.removeAttack)
  const resetAttacker = useSimulatorStore((s) => s.resetAttacker)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
        marginBottom: '16px',
      }}>
        Attacks configured ({attacks.length})
      </div>

      {attacks.length === 0 && (
        <div style={{
          padding: '32px', border: `1px dashed ${BORDER}`,
          textAlign: 'center', fontFamily: 'Space Mono, monospace',
          fontSize: '10px', color: TEXT_WEAK,
        }}>
          No attacks yet. Add at least one attack to continue.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {attacks.map((atk, i) => (
          <AttackCard key={atk._id} attack={atk} idx={i} onEdit={editAttack} onRemove={removeAttack} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => { resetAttacker(); setStep(1) }}
          style={{
            flex: 1, padding: '12px',
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: ACCENT, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'background 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(47,224,255,0.07)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          + Add another attack
        </button>
        {attacks.length > 0 && (
          <button
            onClick={() => setStep(3)}
            style={{
              flex: 1, padding: '12px',
              background: ACCENT, border: `1px solid ${ACCENT}`,
              color: BG, fontFamily: 'Space Mono, monospace', fontSize: '9px',
              fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'opacity 100ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Next: Choose Defender →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step 3: Defender wrapper ─────────────────────────────────────────────────

function DefenderStep() {
  const setStep        = useSimulatorStore((s) => s.setStep)
  const runSimulation  = useSimulatorStore((s) => s.runSimulation)
  const loading        = useSimulatorStore((s) => s.loading)
  const error          = useSimulatorStore((s) => s.error)

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <DefenderPanel />

      {error && (
        <div style={{
          marginTop: '16px', border: `1px solid rgba(255,92,122,0.5)`,
          padding: '10px 14px', fontFamily: 'Space Mono, monospace',
          fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase',
          color: ERROR,
        }}>
          ERROR — {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
        <button
          onClick={() => setStep(2)}
          style={{
            padding: '12px 20px',
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: TEXT_WEAK, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_WEAK }}
        >
          ← Back
        </button>
        <button
          onClick={runSimulation}
          disabled={loading}
          style={{
            flex: 1, padding: '14px',
            background: loading ? SURFACE : ACCENT,
            border: `1px solid ${ACCENT}`,
            color: loading ? TEXT_WEAK : BG,
            fontFamily: 'Space Mono, monospace', fontSize: '11px',
            fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 120ms',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = loading ? '0.5' : '1' }}
        >
          {loading ? 'Running…' : 'Run Simulation →'}
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Results wrapper ──────────────────────────────────────────────────

function ResultsStep() {
  const result   = useSimulatorStore((s) => s.result)
  const setStep  = useSimulatorStore((s) => s.setStep)
  const attacks  = useSimulatorStore((s) => s.attacks)
  const resetAll = useSimulatorStore((s) => s.resetAll)

  return (
    <div>
      {attacks.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: '8px',
            letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
            marginBottom: '10px',
          }}>
            Attacks ({attacks.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {attacks.map((atk) => (
              <div key={atk._id} style={{
                padding: '6px 10px', border: `1px solid ${BORDER}`,
                fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_SEC,
              }}>
                {atk.models}x {atk.weapon.name || 'Custom'}
              </div>
            ))}
          </div>
        </div>
      )}

      <ResultsPanel result={result} />

      <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
        <button
          onClick={() => setStep(2)}
          style={{
            padding: '10px 18px',
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: TEXT_WEAK, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_WEAK }}
        >
          ← Change attacks
        </button>
        <button
          onClick={() => setStep(3)}
          style={{
            padding: '10px 18px',
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: TEXT_WEAK, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_WEAK }}
        >
          ← Change defender
        </button>
        <button
          onClick={resetAll}
          style={{
            padding: '10px 18px',
            background: 'transparent', border: `1px solid ${ERROR}44`,
            color: ERROR, fontFamily: 'Space Mono, monospace', fontSize: '9px',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            transition: 'background 100ms, border-color 100ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${ERROR}18`; e.currentTarget.style.borderColor = ERROR }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${ERROR}44` }}
        >
          ↺ New simulation
        </button>
      </div>
    </div>
  )
}

// ── Separator ────────────────────────────────────────────────────────────────

function Separator() {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '3px',
      color: ACCENT, overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1,
      padding: '10px 0', userSelect: 'none', opacity: 0.4,
    }}>
      {'≈ '.repeat(300)}
    </div>
  )
}

// ── Keyword definitions (WH40K 10th Edition core rules) ─────────────────────

const KEYWORD_DEFS = {
  TORRENT: {
    name: 'Torrent',
    phase: 'Hit Roll',
    rule: 'Each time an attack is made with this weapon, that attack automatically hits the target. No Hit roll is made.',
    note: 'Torrent weapons bypass Ballistic Skill entirely — they always hit regardless of modifiers, cover, or penalties.',
  },
  CRITICAL_HIT_ON: {
    name: 'Critical Hit On X+',
    phase: 'Hit Roll',
    rule: 'Each time an attack is made with this weapon, a Critical Hit is scored on an unmodified Hit roll of X+ instead of only on a 6.',
    note: 'Interacts with Sustained Hits and Lethal Hits — lowering the critical threshold makes those abilities trigger more often.',
  },
  LETHAL_HITS: {
    name: 'Lethal Hits',
    phase: 'Hit Roll → Wound Roll',
    rule: 'Each time an attack is made with this weapon, if a Critical Hit is scored, that attack automatically wounds the target.',
    note: 'The wound is resolved at full AP and Damage. Pairs powerfully with Critical Hit On X+ to generate more auto-wounds.',
  },
  SUSTAINED_HITS: {
    name: 'Sustained Hits X',
    phase: 'Hit Roll',
    rule: 'Each time an attack is made with this weapon, if a Critical Hit is scored, that hit scores X additional hits on the target. The additional hits are not Critical Hits and cannot themselves generate Sustained Hits.',
    note: 'The extra hits roll to wound normally. They benefit from Lethal Hits on the original crit but do not trigger further Sustained Hits.',
  },
  TWIN_LINKED: {
    name: 'Twin-linked',
    phase: 'Wound Roll',
    rule: 'Each time an attack is made with this weapon, you can re-roll the Wound roll.',
    note: 'Applies to every wound roll, not just failures. This is a full re-roll, not limited to results of 1.',
  },
  HEAVY: {
    name: 'Heavy',
    phase: 'Hit Roll',
    rule: 'Each time an attack is made with this weapon, if the attacking model\'s unit Remained Stationary this turn, add 1 to that attack\'s Hit roll.',
    note: 'The +1 is applied after the roll, so it does not affect whether a roll is a Critical Hit (which is always based on the unmodified roll).',
  },
  ASSAULT: {
    name: 'Assault',
    phase: 'Shooting Phase',
    rule: 'This weapon can be fired even if the bearer\'s unit Advanced this turn. If it did, subtract 1 from the Hit roll unless the weapon also has the Torrent ability.',
    note: 'Allows shooting after Advancing. Without Assault, a unit that Advanced cannot fire ranged weapons.',
  },
  RAPID_FIRE: {
    name: 'Rapid Fire X',
    phase: 'Shooting Phase',
    rule: 'Each time the bearer\'s unit is selected to shoot, if the target of this weapon is within half the weapon\'s range, the Attacks characteristic of this weapon is increased by X for that attack.',
    note: 'Stacks with other attack modifiers like Blast. Check range to the closest model in the target unit.',
  },
  EXTRA_ATTACKS: {
    name: 'Extra Attacks X',
    phase: 'Shooting / Fight Phase',
    rule: 'The bearer can make X additional attacks with this weapon on top of any other weapons it can use. These extra attacks are made in addition to the weapon\'s normal attacks.',
    note: 'Unlike other weapons, Extra Attacks weapons do not replace the model\'s other attacks — they are bonus attacks.',
  },
  INDIRECT_FIRE: {
    name: 'Indirect Fire',
    phase: 'Hit Roll',
    rule: 'This weapon can target and make attacks against units that are not visible to the attacking model. If the target is not visible, subtract 1 from the Hit roll and the target is treated as having the Benefit of Cover.',
    note: 'Even if the target is in the open, it gains cover when hit indirectly. Combined with -1 to hit, Indirect Fire is less accurate but bypasses line of sight.',
  },
  PISTOL: {
    name: 'Pistol',
    phase: 'Shooting Phase',
    rule: 'This weapon can be selected to shoot with even if the bearer\'s unit is within Engagement Range of one or more enemy units. In that case, it can only target an enemy unit that is within Engagement Range.',
    note: 'Pistols cannot be used alongside non-Pistol ranged weapons in the same phase if the unit is in Engagement Range.',
  },
  DEVASTATING_WOUNDS: {
    name: 'Devastating Wounds',
    phase: 'Wound Roll',
    rule: 'Each time an attack is made with this weapon, if a Critical Wound is scored, the target suffers Mortal Wounds equal to the Damage characteristic of this weapon. The attack sequence then ends — no saving throw is made.',
    note: 'Mortal wounds bypass armour and invulnerable saves entirely. Critical Wounds are scored on unmodified Wound rolls of 6.',
  },
  LANCE: {
    name: 'Lance',
    phase: 'Wound Roll',
    rule: 'Each time an attack is made with this weapon, if the bearer\'s unit made a Charge move this turn, add 1 to that attack\'s Wound roll.',
    note: 'Like Heavy, the +1 is applied after the roll and does not affect whether a wound is Critical (unmodified 6 only).',
  },
  MELTA: {
    name: 'Melta X',
    phase: 'Damage',
    rule: 'Each time an attack is made with this weapon, if the target is within half this weapon\'s range, increase the Damage characteristic of that attack by X.',
    note: 'Devastating at close range. A Melta 2 weapon with D6 damage becomes D6+2 at half range.',
  },
  ANTI: {
    name: 'Anti-[KEYWORD] X+',
    phase: 'Wound Roll',
    rule: 'Each time an attack is made with this weapon against a target that has the specified keyword, an unmodified Wound roll of X+ scores a Critical Wound.',
    note: 'This lowers the Critical Wound threshold against specific targets. Pairs with Devastating Wounds to inflict mortal wounds more reliably.',
  },
  BLAST: {
    name: 'Blast',
    phase: 'Number of Attacks',
    rule: 'Add 1 to the Attacks characteristic of this weapon for every 5 models in the target unit (rounding down). This weapon can never be used to target a unit that is within Engagement Range of the attacking model\'s unit.',
    note: 'A unit of 11 models adds +2 attacks. Cannot be used in melee. Applied before rolling random attacks (e.g. D6+2 becomes D6+4 vs 11 models).',
  },
  IGNORES_COVER: {
    name: 'Ignores Cover',
    phase: 'Saving Throw',
    rule: 'Each time an attack is made with this weapon, the target cannot claim the Benefit of Cover against that attack.',
    note: 'Cover normally adds +1 to the saving throw. This ability negates that bonus entirely.',
  },
  PRECISION: {
    name: 'Precision',
    phase: 'Wound Allocation',
    rule: 'Each time an attack made with this weapon successfully wounds an Attached unit, if a Critical Hit was scored for that attack, the attacking player can choose to have the attack allocated to a Character model in that unit.',
    note: 'Normally, wounds must be allocated to Bodyguard models first. Precision bypasses this protection on critical hits.',
  },
  HAZARDOUS: {
    name: 'Hazardous',
    phase: 'After Shooting / Fighting',
    rule: 'After a unit shoots or fights, for each Hazardous weapon used by a model in that unit, roll one D6. On a 1, that model suffers 3 mortal wounds (or is destroyed if it is not a Character, Monster, or Vehicle).',
    note: 'The risk applies to your own models. Using multiple Hazardous weapons increases the number of D6 rolls.',
  },
  PSYCHIC: {
    name: 'Psychic',
    phase: 'Shooting Phase',
    rule: 'This is a Psychic weapon. All normal rules for ranged weapons apply.',
    note: 'In 10th Edition, Psychic weapons function like normal weapons. Some abilities specifically interact with or ignore Psychic attacks.',
  },
}

function KeywordDefinitionPanel() {
  const hoveredKeyword = useSimulatorStore((s) => s.hoveredKeyword)
  const lastDefRef = useRef(null)
  const [visible, setVisible] = useState(false)

  const def = hoveredKeyword ? KEYWORD_DEFS[hoveredKeyword] : null
  if (def) lastDefRef.current = def

  const display = def || lastDefRef.current

  useEffect(() => {
    if (def) setVisible(true)
    else {
      const t = setTimeout(() => setVisible(false), 220)
      return () => clearTimeout(t)
    }
  }, [def])

  return (
    <div style={{
      position: 'fixed', left: '48px', top: '50%',
      transform: 'translateY(-50%)',
      width: 'calc((100vw - 560px) / 2 - 48px)',
      maxWidth: '320px',
      display: 'flex', justifyContent: 'center',
      padding: '0 16px', boxSizing: 'border-box',
      pointerEvents: def ? 'auto' : 'none',
      zIndex: 10,
    }}>
      <div style={{
        width: '100%', maxWidth: '300px',
        opacity: def ? 1 : 0,
        transform: def ? 'translateX(0)' : 'translateX(-12px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}>
        {(visible || def) && display && (
          <div style={{
            border: `1px solid ${def ? ACCENT + '44' : BORDER}`,
            background: SURFACE,
            padding: '22px',
            transition: 'border-color 200ms ease',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '7px',
              letterSpacing: '2.5px', textTransform: 'uppercase',
              color: TEXT_OFF, marginBottom: '10px',
            }}>
              {display.phase}
            </div>

            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '14px',
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              color: ACCENT, marginBottom: '16px', lineHeight: 1.2,
            }}>
              {display.name}
            </div>

            <div style={{
              height: '1px',
              background: `linear-gradient(to right, ${ACCENT}44, ${BORDER})`,
              marginBottom: '16px',
            }} />

            <p style={{
              fontFamily: 'Georgia, serif', fontSize: '13px',
              lineHeight: 1.75, color: TEXT_SEC, margin: '0 0 14px 0',
            }}>
              {display.rule}
            </p>

            <div style={{
              padding: '10px 12px',
              background: 'rgba(47,224,255,0.04)',
              borderLeft: `2px solid ${ACCENT}55`,
            }}>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: '7px',
                letterSpacing: '2px', textTransform: 'uppercase',
                color: TEXT_WEAK, marginBottom: '6px',
              }}>
                Note
              </div>
              <p style={{
                fontFamily: 'Georgia, serif', fontSize: '12px',
                lineHeight: 1.7, color: TEXT_WEAK, margin: 0,
                fontStyle: 'italic',
              }}>
                {display.note}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Progress tracker (left side) ─────────────────────────────────────────────

const TRACKER_STYLE_ID = 'progress-tracker-keyframes'

function injectTrackerStyles() {
  if (document.getElementById(TRACKER_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = TRACKER_STYLE_ID
  style.textContent = `
    @keyframes trackerPulse {
      0%   { box-shadow: 0 0 0 0 ${ACCENT}70, 0 0 0 0 ${ACCENT}30; }
      50%  { box-shadow: 0 0 0 7px ${ACCENT}00, 0 0 0 14px ${ACCENT}00; }
      100% { box-shadow: 0 0 0 0 ${ACCENT}00, 0 0 0 0  ${ACCENT}00; }
    }
    @keyframes trackerCompleteIn {
      0%   { transform: scale(0.4); opacity: 0.2; }
      60%  { transform: scale(1.2); opacity: 1; }
      80%  { transform: scale(0.92); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes trackerNodeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes trackerLabelScan {
      0%   { letter-spacing: 3px; opacity: 0.3; }
      60%  { letter-spacing: 1.5px; opacity: 1; }
      100% { letter-spacing: 1.5px; opacity: 1; }
    }
    @keyframes trackerLineGrow {
      from { transform: scaleY(0); transform-origin: top; }
      to   { transform: scaleY(1); transform-origin: top; }
    }
    .tracker-scrollbar::-webkit-scrollbar { width: 3px; }
    .tracker-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .tracker-scrollbar::-webkit-scrollbar-thumb { background: ${ACCENT}22; border-radius: 2px; }
    .tracker-scrollbar::-webkit-scrollbar-thumb:hover { background: ${ACCENT}44; }
    .tracker-node-completed:hover .tracker-summary { color: ${ACCENT} !important; }
  `
  document.head.appendChild(style)
}

const TRACKER_NODES = [
  { id: 1, label: 'Attacker Unit',             hint: 'Browse units or pick from an army',               nav: 1 },
  { id: 2, label: 'Weapon',                    hint: 'Select your weapon — check the ability panel →',  nav: 1 },
  { id: 3, label: 'Abilities & Keywords',      hint: 'Review abilities — any rerolls or crit thresholds?', nav: 1 },
  { id: 4, label: 'Attack Roster',             hint: 'Will you fire more weapons at the same target?',  nav: 2 },
  { id: 5, label: 'Target',                    hint: 'Choose your defender — review their abilities',   nav: 3 },
  { id: 6, label: 'Simulate',                  hint: 'Run simulation →',                               nav: 4 },
]

function ProgressTracker() {
  const step           = useSimulatorStore((s) => s.step)
  const setStep        = useSimulatorStore((s) => s.setStep)
  const attackerUnit   = useSimulatorStore((s) => s.attackerUnit)
  const weapon         = useSimulatorStore((s) => s.attacker.weapon)
  const attacks        = useSimulatorStore((s) => s.attacks)
  const buffs          = useSimulatorStore((s) => s.attacker.buffs)
  const defender       = useSimulatorStore((s) => s.defender)
  const result         = useSimulatorStore((s) => s.result)
  const hoveredKeyword = useSimulatorStore((s) => s.hoveredKeyword)

  const nodeRefs   = useRef({})
  const circleKeys = useRef({})

  useEffect(() => { injectTrackerStyles() }, [])

  const hasUnit            = attackerUnit !== null || weapon.name !== ''
  const hasWeapon          = weapon.name !== ''
  const hasConfirmedAttack = attacks.length > 0

  function getStatus(id) {
    switch (id) {
      case 1: return hasUnit   ? 'completed' : 'active'
      case 2:
        if (!hasUnit) return 'future'
        return (hasWeapon || hasConfirmedAttack) ? 'completed' : 'active'
      case 3:
        if (!hasWeapon && !hasConfirmedAttack) return 'future'
        return step >= 2 ? 'completed' : 'active'
      case 4:
        if (step < 2)   return 'future'
        return step > 2 ? 'completed' : 'active'
      case 5:
        if (step < 3)   return 'future'
        return step >= 4 ? 'completed' : 'active'
      case 6:
        if (step < 3 || attacks.length === 0) return 'future'
        return step === 4 ? 'completed' : 'active'
      default: return 'future'
    }
  }

  function getSummary(id) {
    switch (id) {
      case 1: {
        if (attackerUnit) return `${attackerUnit.name} · T${attackerUnit.T} · Sv${attackerUnit.Sv}+ · W${attackerUnit.W}`
        return weapon.name || '—'
      }
      case 2: {
        // weapon resets after addAttack() — fall back to last confirmed attack
        const src = weapon.name ? weapon : attacks[attacks.length - 1]?.weapon
        if (!src) return '—'
        const kwCount = src.keywords?.length ?? 0
        return `${src.name}${kwCount > 0 ? ` · ${kwCount} kw` : ''}`
      }
      case 3: {
        // same: read from last attack when current attacker was reset
        const srcBuffs  = buffs.length > 0 ? buffs  : (attacks[attacks.length - 1]?.buffs ?? [])
        const srcKws    = weapon.keywords.length > 0 ? weapon.keywords : (attacks[attacks.length - 1]?.weapon.keywords ?? [])
        const parts = []
        srcBuffs.forEach((b) => {
          if (b.type === 'REROLL_HITS')   parts.push(b.value === 'all' ? 'RR hits' : 'RR hit 1s')
          if (b.type === 'REROLL_WOUNDS') parts.push(b.value === 'all' ? 'RR wounds' : 'RR wound 1s')
        })
        const critKw = srcKws.find((k) => k.type === 'CRITICAL_HIT_ON')
        if (critKw) parts.push(`Crit ${critKw.value}+`)
        return parts.length > 0 ? parts.join(' · ') : 'No extra abilities'
      }
      case 4:
        return `${attacks.length} attack${attacks.length !== 1 ? 's' : ''} configured`
      case 5: {
        const d = defender
        return `T${d.toughness} · Sv${d.save}+${d.invuln ? ` · ${d.invuln}++` : ''} · W${d.wounds}`
      }
      case 6:
        return 'Done — results below'
      default: return ''
    }
  }

  // Update circleKeys — detect status transitions to re-mount circles for animations
  // (placed after getStatus so all deps are in scope)
  TRACKER_NODES.forEach((node) => {
    const status = getStatus(node.id)
    const prev   = circleKeys.current[node.id]
    if (!prev) {
      circleKeys.current[node.id] = { status, v: 0 }
    } else if (prev.status !== status) {
      circleKeys.current[node.id] = { status, v: prev.v + 1 }
    }
  })

  // Auto-scroll active node into view
  useEffect(() => {
    const activeId = TRACKER_NODES.find((n) => getStatus(n.id) === 'active')?.id
    if (activeId && nodeRefs.current[activeId]) {
      nodeRefs.current[activeId].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [step, hasUnit, hasWeapon, attacks.length, result]) // eslint-disable-line

  return (
    <div style={{
      position: 'fixed',
      left: '32px',
      right: 'calc(50% + 280px + 24px)',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 5,
      opacity: hoveredKeyword ? 0.12 : 1,
      transition: 'opacity 150ms ease',
      pointerEvents: hoveredKeyword ? 'none' : 'auto',
      padding: '4px 8px 4px 20px',
    }}>
      {/* Header */}
      <div style={{
        fontFamily: 'Space Mono, monospace', fontSize: '8px',
        letterSpacing: '3px', textTransform: 'uppercase',
        color: TEXT_OFF, marginBottom: '24px',
      }}>
        Progress
      </div>

      <div
        className="tracker-scrollbar"
        style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', padding: '18px 4px 18px 18px' }}
      >
        {TRACKER_NODES.map((node, i) => {
          const status      = getStatus(node.id)
          const isCompleted = status === 'completed'
          const isActive    = status === 'active'
          const isLast      = i === TRACKER_NODES.length - 1
          const circleKey   = `${node.id}-${circleKeys.current[node.id]?.v ?? 0}`

          return (
            <div
              key={node.id}
              ref={(el) => { nodeRefs.current[node.id] = el }}
              className={isCompleted ? 'tracker-node-completed' : ''}
              style={{ display: 'flex', alignItems: 'stretch', gap: '16px' }}
            >
              {/* Left column: circle + connecting line */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', width: '18px', flexShrink: 0, paddingTop: '1px',
              }}>
                {/* Circle — keyed to re-mount on status transition */}
                <div
                  key={circleKey}
                  style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: `2px solid ${isActive || isCompleted ? ACCENT : BORDER}`,
                    background: isCompleted ? ACCENT : isActive ? `${ACCENT}18` : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    animation: isCompleted
                      ? 'trackerCompleteIn 420ms cubic-bezier(0.34,1.56,0.64,1) forwards'
                      : isActive
                        ? 'trackerPulse 2s ease-out infinite'
                        : 'none',
                    transition: 'border-color 300ms',
                  }}
                >
                  {isCompleted && (
                    <span style={{ fontSize: '9px', color: BG, fontWeight: 900, lineHeight: 1 }}>✓</span>
                  )}
                  {isActive && (
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: ACCENT,
                      boxShadow: `0 0 6px ${ACCENT}88`,
                    }} />
                  )}
                </div>

                {!isLast && (
                  <div style={{
                    width: '2px', flex: 1, minHeight: '18px',
                    background: isCompleted
                      ? `linear-gradient(to bottom, ${ACCENT}66, ${ACCENT}33)`
                      : `${BORDER}`,
                    marginTop: '4px',
                    transition: 'background 500ms ease',
                  }} />
                )}
              </div>

              {/* Right column: label + content */}
              <div
                onClick={() => isCompleted && setStep(node.nav)}
                style={{
                  flex: 1,
                  paddingBottom: isLast ? '4px' : '28px',
                  cursor: isCompleted ? 'pointer' : 'default',
                }}
              >
                {/* Label */}
                <div
                  key={isActive ? `label-active-${node.id}` : `label-${node.id}`}
                  style={{
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '10px',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: isActive ? ACCENT : isCompleted ? TEXT_SEC : TEXT_OFF,
                    fontWeight: isActive ? 700 : 400,
                    lineHeight: 1,
                    marginBottom: (isActive || isCompleted) ? '8px' : 0,
                    transition: 'color 300ms',
                    animation: isActive ? 'trackerLabelScan 400ms ease forwards' : 'none',
                  }}
                >
                  {node.label}
                </div>

                {isActive && (
                  <div
                    key={`hint-${node.id}-${circleKey}`}
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '12px',
                      color: TEXT_WEAK,
                      lineHeight: 1.65,
                      animation: 'trackerNodeIn 320ms ease forwards',
                    }}
                  >
                    {node.hint}
                  </div>
                )}

                {isCompleted && (
                  <div
                    className="tracker-summary"
                    style={{
                      fontFamily: 'Space Mono, monospace',
                      fontSize: '10px',
                      color: TEXT_WEAK,
                      letterSpacing: '0.3px',
                      lineHeight: 1.55,
                      transition: 'color 150ms',
                    }}
                  >
                    {getSummary(node.id)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Unit abilities panel (right side) ────────────────────────────────────────

const ABILITIES_PANEL_STYLE_ID = 'abilities-panel-keyframes'

function injectAbilitiesStyles() {
  if (document.getElementById(ABILITIES_PANEL_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = ABILITIES_PANEL_STYLE_ID
  style.textContent = `
    @keyframes abilityCardIn {
      from { opacity: 0; transform: translateX(10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes headerScan {
      0%   { letter-spacing: 4px; opacity: 0; }
      60%  { letter-spacing: 1px; opacity: 1; }
      100% { letter-spacing: 1px; opacity: 1; }
    }
    @keyframes dividerGrow {
      from { transform: scaleX(0); transform-origin: left; }
      to   { transform: scaleX(1); transform-origin: left; }
    }
    .abilities-scrollbar::-webkit-scrollbar { width: 4px; }
    .abilities-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .abilities-scrollbar::-webkit-scrollbar-thumb { background: ${ACCENT}33; border-radius: 2px; }
    .abilities-scrollbar::-webkit-scrollbar-thumb:hover { background: ${ACCENT}66; }
    .ability-card {
      padding: 10px 12px;
      background: rgba(47,224,255,0.03);
      border-left: 2px solid ${ACCENT}44;
      transition: background 150ms ease, border-left-color 150ms ease, border-left-width 150ms ease;
      cursor: default;
    }
    .ability-card:hover {
      background: rgba(47,224,255,0.07);
      border-left-color: ${ACCENT}99;
      border-left-width: 3px;
    }
  `
  document.head.appendChild(style)
}

function UnitAbilitiesPanel({ role }) {
  const unit = useSimulatorStore((s) =>
    role === 'attacker' ? s.attackerUnit : s.defenderUnit
  )

  const abilities = unit?.abilities ?? []
  const hasAbilities = abilities.length > 0

  // Track unit identity to re-trigger card animations on unit change
  const [animKey, setAnimKey] = useState(0)
  const prevUnitId = useRef(null)

  useEffect(() => {
    injectAbilitiesStyles()
  }, [])

  useEffect(() => {
    const newId = unit?.id ?? null
    if (newId !== prevUnitId.current) {
      prevUnitId.current = newId
      if (newId) setAnimKey(k => k + 1)
    }
  }, [unit?.id])

  return (
    <div style={{
      position: 'fixed',
      left: 'calc(50% + 280px + 24px)',
      right: '48px',
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: hasAbilities ? 'auto' : 'none',
      zIndex: 10,
    }}>
      <div style={{
        width: '100%',
        opacity: hasAbilities ? 1 : 0,
        transform: hasAbilities ? 'translateX(0)' : 'translateX(16px)',
        transition: 'opacity 300ms ease, transform 300ms ease',
      }}>
        {hasAbilities && (
          <div
            className="abilities-scrollbar"
            style={{
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              padding: '18px',
              maxHeight: 'calc(100vh - 160px)',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '7px',
              letterSpacing: '2.5px', textTransform: 'uppercase',
              color: TEXT_OFF, marginBottom: '6px',
            }}>
              {role === 'attacker' ? 'Attacker' : 'Defender'} unit
            </div>
            <div
              key={`name-${animKey}`}
              style={{
                fontFamily: 'Space Mono, monospace', fontSize: '13px',
                fontWeight: 700, textTransform: 'uppercase',
                color: ACCENT, marginBottom: '14px', lineHeight: 1.2,
                animation: 'headerScan 400ms ease forwards',
              }}
            >
              {unit.name}
            </div>
            <div
              key={`divider-${animKey}`}
              style={{
                height: '1px',
                background: `linear-gradient(to right, ${ACCENT}44, ${BORDER})`,
                marginBottom: '14px',
                animation: 'dividerGrow 350ms ease forwards',
              }}
            />

            {/* Abilities count */}
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: '7px',
              letterSpacing: '2px', textTransform: 'uppercase',
              color: TEXT_WEAK, marginBottom: '12px',
            }}>
              {abilities.length} abilit{abilities.length !== 1 ? 'ies' : 'y'}
            </div>

            {/* Ability cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {abilities.map((ab, i) => (
                <div
                  key={`${animKey}-${i}`}
                  className="ability-card"
                  style={{
                    animation: `abilityCardIn 280ms ease forwards`,
                    animationDelay: `${i * 40}ms`,
                    opacity: 0,
                  }}
                >
                  <div style={{
                    fontFamily: 'Space Mono, monospace', fontSize: '10px',
                    fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                    color: TEXT, marginBottom: '6px',
                  }}>
                    {ab.name}
                  </div>
                  {ab.desc && (
                    <p style={{
                      fontFamily: 'Georgia, serif', fontSize: '11px',
                      lineHeight: 1.65, color: TEXT_SEC, margin: 0,
                    }}>
                      <AbilityText text={ab.desc} />
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 1: Attack wrapper ───────────────────────────────────────────────────

function AttackStep() {
  const addAttack   = useSimulatorStore((s) => s.addAttack)
  const weapon      = useSimulatorStore((s) => s.attacker.weapon)
  const editingIdx  = useSimulatorStore((s) => s.editingIdx)
  const attacks     = useSimulatorStore((s) => s.attacks)
  const setStep     = useSimulatorStore((s) => s.setStep)

  const hasWeapon = Boolean(weapon.name)

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <AttackerPanel />

      <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
        <button
          onClick={addAttack}
          disabled={!hasWeapon}
          style={{
            flex: 1, padding: '14px',
            background: hasWeapon ? ACCENT : 'transparent',
            border: `1px solid ${hasWeapon ? ACCENT : BORDER}`,
            color: hasWeapon ? BG : TEXT_OFF,
            fontFamily: 'Space Mono, monospace', fontSize: '10px',
            fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
            cursor: hasWeapon ? 'pointer' : 'default',
            opacity: hasWeapon ? 1 : 0.4,
            transition: 'opacity 120ms',
          }}
          onMouseEnter={(e) => { if (hasWeapon) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = hasWeapon ? '1' : '0.4' }}
        >
          {editingIdx !== null ? 'Save changes →' : 'Confirm attack →'}
        </button>
      </div>

      {attacks.length > 0 && (
        <div style={{
          marginTop: '16px', textAlign: 'center',
          fontFamily: 'Space Mono, monospace', fontSize: '9px', color: TEXT_WEAK,
        }}>
          {attacks.length} attack{attacks.length > 1 ? 's' : ''} already configured —{' '}
          <button
            onClick={() => setStep(2)}
            style={{
              background: 'none', border: 'none', color: ACCENT,
              fontFamily: 'Space Mono, monospace', fontSize: '9px',
              cursor: 'pointer', textDecoration: 'underline', padding: 0,
            }}
          >
            review
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export function SimulatorPage() {
  const step     = useSimulatorStore((s) => s.step)
  const setStep  = useSimulatorStore((s) => s.setStep)
  const resetAll = useSimulatorStore((s) => s.resetAll)

  useEffect(() => {
    document.title = "Combat Simulator — Warhammer 40K Probability | Prob'Hammer"
  }, [])

  const [resetHover, setResetHover] = useState(false)

  const contentRef = useRef(null)
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  return (
    <div style={{ color: TEXT_SEC, minHeight: '100vh', paddingTop: '52px' }}>

      <div style={{ padding: '0 48px' }}>
        <Separator />
        <div style={{ padding: '18px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              <h1 style={{
                fontFamily: 'Space Mono, monospace', fontWeight: 700,
                fontSize: 'clamp(18px, 2vw, 26px)', letterSpacing: '0.05em',
                textTransform: 'uppercase', lineHeight: 1, color: TEXT,
              }}>
                Probability Simulator
              </h1>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '10px',
                letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_WEAK,
              }}>
                Monte Carlo &middot; WH40K 10e
              </span>
            </div>
            <button
              onClick={resetAll}
              onMouseEnter={() => setResetHover(true)}
              onMouseLeave={() => setResetHover(false)}
              title="Reset all — start a new simulation from scratch"
              style={{
                background: resetHover ? ERROR : `${ERROR}22`,
                border: `1px solid ${ERROR}`,
                color: resetHover ? BG : ERROR,
                fontFamily: 'Space Mono, monospace', fontSize: '10px',
                fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                padding: '9px 20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'background 120ms, color 120ms',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                <path d="M11 2.5A5.5 5.5 0 1 0 11.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <polyline points="9,0.5 11,2.5 9,4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Reset
            </button>
          </div>
        </div>
        <Separator />
      </div>

      <StepBar current={step} onStep={setStep} />

      <section ref={contentRef} style={{ padding: '36px 48px 80px', minHeight: 'calc(100vh - 200px)', position: 'relative' }}>
        {step !== 4 && <ProgressTracker />}
        {step === 1 && <KeywordDefinitionPanel />}
        {step === 1 && <UnitAbilitiesPanel role="attacker" />}
        {step === 1 && <AttackStep />}
        {step === 2 && <ReviewStep />}
        {step === 3 && <UnitAbilitiesPanel role="defender" />}
        {step === 3 && <DefenderStep />}
        {step === 4 && <ResultsStep />}
      </section>

      <div style={{ padding: '0 48px 24px' }}>
        <Separator />
        <div style={{
          display: 'flex', justifyContent: 'space-between', paddingTop: '12px',
          fontFamily: 'Space Mono, monospace', fontSize: '9px',
          letterSpacing: '2px', textTransform: 'uppercase', color: TEXT_OFF,
        }}>
          <span>WH40K PROBABILITY ENGINE — V2</span>
          <span>SIMULATION RUNS IN BROWSER — ZERO LATENCY</span>
        </div>
      </div>
    </div>
  )
}
