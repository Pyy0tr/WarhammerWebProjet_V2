/**
 * scripts/generate-pages.js
 * Post-build: creates per-page index.html copies with correct meta tags + noscript content.
 * Run after `vite build` — reads dist/index.html (already has hashed JS/CSS)
 * and writes dist/<route>/index.html for each SPA route.
 *
 * S3+CloudFront serves dist/simulator/index.html when /simulator is requested,
 * giving crawlers (Google, Reddit, Discord) page-specific titles and descriptions.
 * Noscript blocks provide real text content for Googlebot's first-wave HTML crawl.
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
    route:       null,
    title:       "Prob'Hammer — Warhammer 40K Probability & Dice Calculator",
    description: "Free Warhammer 40,000 10th Edition probability calculator. Simulate full attack sequences — hits, wounds, saves, damage — across 1,495 units and 46 factions. Monte Carlo engine, runs in your browser.",
    ogTitle:     "Prob'Hammer — Warhammer 40K Probability Calculator",
    ogDesc:      "Simulate Warhammer 40K attack sequences before you roll. Full damage distribution, 1,495 units, 46 factions, all 10th Edition keywords. Free & instant.",
    noscript:
`<h1>Prob'Hammer — Warhammer 40K Probability Calculator</h1>
<p>Free Warhammer 40,000 10th Edition probability calculator and combat simulator. No account required, runs entirely in your browser.</p>
<ul>
  <li><a href="/simulator">Combat Simulator</a> — Simulate any attack sequence and get a full damage distribution</li>
  <li><a href="/factions">Unit Browser</a> — Browse 1,495 units across 46 factions</li>
  <li><a href="/keywords">Keywords Reference</a> — All 10th Edition weapon special rules explained</li>
  <li><a href="/combos">Synergy Matrix</a> — Compare weapon configs against multiple defender profiles</li>
</ul>`,
  },
  {
    route:       'simulator',
    title:       "Combat Simulator — Warhammer 40K Probability | Prob'Hammer",
    description: "Configure any WH40K 10th Edition weapon — keywords, re-rolls, buffs — and get an instant full damage distribution. Monte Carlo engine, 2,000 trials, runs entirely in your browser. Free.",
    ogTitle:     "Prob'Hammer — WH40K Combat Simulator",
    ogDesc:      "Simulate any attack sequence in seconds. Pick your weapon, enable keywords, choose a target — get the damage histogram instantly. 1,495 units, 46 factions.",
    noscript:
`<h1>Warhammer 40K Combat Simulator — Prob'Hammer</h1>
<p>Simulate any Warhammer 40,000 10th Edition attack sequence in your browser. Configure attacks, keywords, and buffs — get a full damage probability distribution from 2,000 Monte Carlo trials.</p>
<h2>Supported Keywords</h2>
<p>Torrent, Lethal Hits, Devastating Wounds, Sustained Hits, Twin-Linked, ANTI, Melta, Blast, Rapid Fire, Lance, Heavy, Indirect Fire, Ignores Cover</p>
<h2>Database</h2>
<p>1,495 units · 3,561 weapons · 46 factions — sourced from BSData community data</p>`,
  },
  {
    route:       'factions',
    title:       "46 Factions, 1,495 Units — WH40K Database | Prob'Hammer",
    description: "Browse all 46 Warhammer 40,000 10th Edition factions and 1,495 units from the BSData community database. Click any unit to load its weapons directly into the simulator.",
    ogTitle:     "WH40K Unit Database — 46 Factions | Prob'Hammer",
    ogDesc:      "Every faction, every unit. From Space Marines to T'au to Tyranids — browse and simulate any weapon profile in one click.",
    noscript:
`<h1>Warhammer 40K Faction & Unit Browser — Prob'Hammer</h1>
<p>Browse all 46 Warhammer 40,000 10th Edition factions and 1,495 units. View full datasheets with stats, weapons, abilities, and points cost. Load any weapon directly into the simulator.</p>
<h2>Factions</h2>
<p>Space Marines, Chaos Space Marines, Tyranids, T'au Empire, Aeldari, Necrons, Orks, Astra Militarum, Adeptus Mechanicus, Death Guard, Thousand Sons, World Eaters, and 34 more.</p>`,
  },
  {
    route:       'keywords',
    title:       "Weapon Keywords Reference — WH40K 10th Edition | Prob'Hammer",
    description: "Complete reference for all Warhammer 40,000 10th Edition weapon special rules. Understand how Lethal Hits, Devastating Wounds, Sustained Hits, Twin-Linked, and other keywords affect your attack probability.",
    ogTitle:     "WH40K 10th Edition Keywords — Prob'Hammer",
    ogDesc:      "Every weapon keyword explained with probability impact. Lethal Hits, Devastating Wounds, Sustained Hits, Twin-Linked, ANTI, Melta, Blast, and more.",
    noscript:
`<h1>Warhammer 40K 10th Edition Weapon Keywords — Prob'Hammer</h1>
<p>Complete reference for all Warhammer 40,000 10th Edition weapon special rules and their probability impact on attack sequences.</p>
<h2>Keywords</h2>
<ul>
  <li><strong>Torrent</strong> — Bypasses Hit rolls, always hits</li>
  <li><strong>Lethal Hits</strong> — Critical hits auto-wound, skipping the Wound roll</li>
  <li><strong>Devastating Wounds</strong> — Critical wounds bypass Armour Save</li>
  <li><strong>Sustained Hits X</strong> — Critical hits generate X additional hits</li>
  <li><strong>Twin-Linked</strong> — Re-roll all failed Wound rolls</li>
  <li><strong>ANTI [keyword] X+</strong> — Wound roll of X+ is always a Critical Wound vs matching targets</li>
  <li><strong>Melta X</strong> — Add X to Damage within half range</li>
  <li><strong>Blast</strong> — +1 attack per 5 models in the target unit</li>
  <li><strong>Rapid Fire X</strong> — Add X attacks per model at half range</li>
  <li><strong>Lance</strong> — +1 to Wound rolls after charging</li>
  <li><strong>Heavy</strong> — +1 to Hit rolls if unit Remained Stationary</li>
  <li><strong>Indirect Fire</strong> — -1 to Hit rolls when firing indirectly</li>
  <li><strong>Ignores Cover</strong> — Target's Cover bonus is ignored</li>
</ul>`,
  },
  {
    route:       'combos',
    title:       "Synergy Matrix — Multi-Target Weapon Comparison | Prob'Hammer",
    description: "Compare multiple weapon configurations against multiple Warhammer 40K defender profiles in one view. Define synergy columns and target rows to find the most efficient attack loadout.",
    ogTitle:     "WH40K Synergy Matrix — Prob'Hammer",
    ogDesc:      "Compare weapon configs vs multiple defenders in one matrix. Up to 8 synergy columns, 6 defender rows, full damage distribution per cell.",
    noscript:
`<h1>Warhammer 40K Synergy Matrix — Prob'Hammer</h1>
<p>Compare multiple weapon configurations against multiple defender profiles simultaneously. Define up to 8 synergy columns and 6 target rows to find the optimal attack combination for any situation.</p>
<h2>Features</h2>
<ul>
  <li>Up to 8 weapon synergy configurations (Lethal Hits, Sustained Hits, Devastating Wounds, custom buffs)</li>
  <li>Up to 6 defender profiles with full stat blocks</li>
  <li>Full damage distribution and phase funnel for each combination</li>
  <li>Kill probability for multi-wound targets</li>
</ul>`,
  },
  {
    route:       'learn',
    title:       "How Warhammer 40K Probability Works — Prob'Hammer",
    description: "Learn how Warhammer 40,000 10th Edition attack probability works. From hit rolls to wound rolls, armour saves, invulnerable saves, and Feel No Pain — understand the math behind each phase.",
    ogTitle:     "Learn WH40K Probability — Prob'Hammer",
    ogDesc:      "Understand the probability behind every WH40K attack phase: Hit, Wound, Save, Feel No Pain. Explained with interactive examples.",
    noscript:
`<h1>How Warhammer 40K Probability Works — Prob'Hammer</h1>
<p>Understand the math behind Warhammer 40,000 10th Edition attacks. Each attack rolls through four sequential phases — Hit, Wound, Save, and Feel No Pain.</p>
<h2>Attack Phases</h2>
<ul>
  <li><strong>Hit Roll</strong> — Roll D6 against the weapon's Ballistic Skill (BS) or Weapon Skill (WS)</li>
  <li><strong>Wound Roll</strong> — Roll D6, comparing weapon Strength (S) against target Toughness (T)</li>
  <li><strong>Armour Save</strong> — Target rolls D6 against its Save value (or Invulnerable Save)</li>
  <li><strong>Feel No Pain</strong> — Survivor roll to negate damage after a failed save</li>
</ul>`,
  },
  {
    route:       'armies',
    title:       "Army Builder — WH40K Combat Probability | Prob'Hammer",
    description: "Save your Warhammer 40K army lists and simulate combined attack sequences against any target. Compare weapons across your whole list in one run.",
    ogTitle:     "Army Builder | Prob'Hammer WH40K",
    ogDesc:      "Build and save your WH40K army. Simulate the full firepower of your list against any target unit.",
    noscript:
`<h1>Warhammer 40K Army Builder — Prob'Hammer</h1>
<p>Create and save Warhammer 40,000 army lists. Add units from the browser, simulate combined firepower against any target, and compare weapons across your entire army.</p>`,
  },
]

function patch(html, page) {
  const url = page.route ? `${SITE}/${page.route}` : `${SITE}/`

  let result = html
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

  if (page.noscript) {
    result = result.replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n    <noscript>\n    ${page.noscript}\n    </noscript>`
    )
  }

  return result
}

for (const page of PAGES) {
  const dir  = page.route ? path.join(distDir, page.route) : distDir
  const file = path.join(dir, 'index.html')
  if (page.route) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, patch(base, page))
  console.log(`  ✓ dist/${page.route ? page.route + '/' : ''}index.html`)
}

console.log(`\nGenerated ${PAGES.length} page-specific HTML files.`)
