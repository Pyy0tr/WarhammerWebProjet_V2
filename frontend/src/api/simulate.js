const BASE = '/api'

export async function runSimulation(payload) {
  const res = await fetch(`${BASE}/simulate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail?.[0]?.msg ?? `HTTP ${res.status}`)
  }
  return res.json()
}
