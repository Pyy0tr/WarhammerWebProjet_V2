/**
 * engine/dice.js
 * Dice rolling utilities — port of backend/engine/dice.py
 * Supports: "4", "D6", "D6+2", "2D3", "2D6+1"
 */

export function roll(expr) {
  if (typeof expr === 'number') return Math.max(1, Math.floor(expr))

  const s = String(expr).toUpperCase().trim()

  if (/^\d+$/.test(s)) return Math.max(1, parseInt(s, 10))

  let m

  // D6
  m = s.match(/^D(\d+)$/)
  if (m) return randInt(1, parseInt(m[1]))

  // D6+2
  m = s.match(/^D(\d+)\+(\d+)$/)
  if (m) return randInt(1, parseInt(m[1])) + parseInt(m[2])

  // 2D6
  m = s.match(/^(\d+)D(\d+)$/)
  if (m) {
    const [, n, f] = m
    return sumDice(parseInt(n), parseInt(f))
  }

  // 2D6+1
  m = s.match(/^(\d+)D(\d+)\+(\d+)$/)
  if (m) {
    const [, n, f, b] = m
    return sumDice(parseInt(n), parseInt(f)) + parseInt(b)
  }

  return 1 // fallback
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sumDice(n, faces) {
  let total = 0
  for (let i = 0; i < n; i++) total += randInt(1, faces)
  return total
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

export function woundThreshold(strength, toughness) {
  if (strength >= 2 * toughness) return 2
  if (strength > toughness)      return 3
  if (strength === toughness)    return 4
  if (toughness >= 2 * strength) return 6
  return 5
}

export function d6() {
  return randInt(1, 6)
}
