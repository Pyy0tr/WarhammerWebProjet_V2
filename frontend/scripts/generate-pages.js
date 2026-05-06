/**
 * scripts/generate-pages.js
 * Post-build: creates per-page index.html copies with correct meta tags.
 * Run after `vite build` — reads dist/index.html (already has hashed JS/CSS)
 * and writes dist/<route>/index.html for each SPA route.
 *
 * S3+CloudFront serves dist/simulator/index.html when /simulator is requested,
 * giving crawlers (Google, Reddit, Discord) page-specific titles and descriptions.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir   = path.resolve(__dirname, '../dist')
const base      = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8')

const SITE = 'https://40k.probhammer.com'

const PAGES = [
  {
    route:       'simulator',
    title:       "Combat Simulator — Warhammer 40K Probability | Prob'Hammer",
    description: "Configure any WH40K 10th Edition weapon — keywords, re-rolls, buffs — and get an instant full damage distribution. Monte Carlo engine, 1000 trials, runs entirely in your browser. Free.",
    ogTitle:     "Prob'Hammer — WH40K Combat Simulator",
    ogDesc:      "Simulate any attack sequence in seconds. Pick your weapon, enable keywords, choose a target — get the damage histogram instantly. 1487 units, 46 factions.",
  },
  {
    route:       'factions',
    title:       "46 Factions, 1487 Units — WH40K Database | Prob'Hammer",
    description: "Browse all 46 Warhammer 40,000 10th Edition factions and 1,487 units from the BSData community database. Click any unit to load its weapons directly into the simulator.",
    ogTitle:     "WH40K Unit Database — 46 Factions | Prob'Hammer",
    ogDesc:      "Every faction, every unit. From Space Marines to T'au to Tyranids — browse and simulate any weapon profile in one click.",
  },
  {
    route:       'armies',
    title:       "Army Builder — WH40K Combat Probability | Prob'Hammer",
    description: "Save your Warhammer 40K army lists and simulate combined attack sequences against any target. Compare weapons across your whole list in one run.",
    ogTitle:     "Army Builder | Prob'Hammer WH40K",
    ogDesc:      "Build and save your WH40K army. Simulate the full firepower of your list against any target unit.",
  },
]

function patch(html, page) {
  const url = `${SITE}/${page.route}`

  return html
    .replace(
      /<title>.*?<\/title>/,
      `<title>${page.title}</title>`
    )
    .replace(
      /<meta name="description" content=".*?"[^>]*>/,
      `<meta name="description" content="${page.description}" />`
    )
    .replace(
      /<link rel="canonical" href=".*?"[^>]*>/,
      `<link rel="canonical" href="${url}" />`
    )
    .replace(
      /<meta property="og:url" content=".*?"[^>]*>/,
      `<meta property="og:url" content="${url}" />`
    )
    .replace(
      /<meta property="og:title" content=".*?"[^>]*>/,
      `<meta property="og:title" content="${page.ogTitle}" />`
    )
    .replace(
      /<meta property="og:description" content=".*?"[^>]*>/,
      `<meta property="og:description" content="${page.ogDesc}" />`
    )
    .replace(
      /<meta name="twitter:title" content=".*?"[^>]*>/,
      `<meta name="twitter:title" content="${page.ogTitle}" />`
    )
    .replace(
      /<meta name="twitter:description" content=".*?"[^>]*>/,
      `<meta name="twitter:description" content="${page.ogDesc}" />`
    )
}

for (const page of PAGES) {
  const dir  = path.join(distDir, page.route)
  const file = path.join(dir, 'index.html')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, patch(base, page))
  console.log(`  ✓ dist/${page.route}/index.html`)
}

console.log(`\nGenerated ${PAGES.length} page-specific HTML files.`)
