# WH40K V11 — Changements confirmés

> Document de suivi tenu à jour au fur et à mesure que les changements V11 sont confirmés.
> Ne contient que des infos validées par l'utilisateur — pour les rumeurs/notes de travail antérieures au lancement, voir `V11_NOTES.txt`.

Dernière mise à jour : 2026-07-01
Sources jusqu'ici : (1) article récapitulatif V10 vs V11 (blog non officiel), (2) transcript vidéo YouTube "Creative Wargame", (3) données réelles du repo communautaire `vflam/wh40k-11e` (texte de règles embarqué dans le JSON — probablement la source la plus fiable des trois, mais reste un dataset communautaire non estampillé GW).

---

## 1. Changements impactant le moteur de simulation

Fichiers concernés : `frontend/src/engine/simulation.js`, `frontend/src/engine/keywords.js`.

### Statut d'implémentation (2026-07-01) : moteur V11 codé et branché
`frontend/src/engine/simulation_v11.js` — fork littéral de `simulation.js` (même logique, mêmes bugs "intentionnels" comme le cap anti-overkill), avec seulement les 3 changements moteur réels appliqués :
- **Cover** : déplacé de `armorSv -= 1` (phase Save) vers `hitMalus -= 1` (phase Hit), y compris dans le pré-calcul SET_ROLL_TO_6 (qui ne soustrait plus 1 pour cover sur `arSvPre`). `IGNORES_COVER` annule maintenant ce malus de tir au lieu du bonus de sauvegarde — même rôle, autre phase.
- **Psychic** : ignore les malus de tir négatifs (Cover, Indirect Fire, debuff défenseur) mais garde les bonus positifs (Heavy) ; le jet pour blesser (`woundMod`) n'est pas touché, conformément au texte de règle confirmé.
- **Cleave** : ajouté en Phase 1 (`cleaveBonus = hasCleave ? Math.floor(d.models / 5) : 0`), sommé avec `blastBonus` dans `numAttacks` — copie exacte de la logique Blast.
- **Heavy** : **aucun changement de code** au final — le calcul (+1 au jet pour toucher, ne touche pas les critiques) est identique entre V10 et V11 ; seules les conditions réelles qui justifient de cocher la case changent (3" + non engagé + pas déployé ce tour), ce qui relève de la doc/UI, pas du moteur.
- Exclusion Cover pour MONSTRES/VÉHICULES : **non implémentée**, reste non confirmée par le texte de règle (vidéo seule) — Cover s'applique universellement dans les deux moteurs pour l'instant.

Branchement edition-aware (`useDataStore().edition === 'v11' ? simulate_v11 : simulate_v10`) dans :
- `frontend/src/store/simulatorStore.js` (`runSimulation`, lu à chaque clic sur "Run")
- `frontend/src/pages/ComboPage.jsx` (Synergy Matrix — `computeMatrix` reçoit la fonction en paramètre, recalcule aussi au toggle d'édition)
- `frontend/src/pages/KeywordsPage.jsx` (démos "Live comparison" — désormais réellement différentes entre éditions pour Cover/Psychic/Cleave, plus plausibles pour Heavy puisque le calcul est identique)

Testé en local (navigateur headless) : Cleave 2.67→4.43 dmg moyen (vs 20 modèles), Psychic 0.88→1.38 (annule le malus Cover), Ignores Cover 0.99→1.36 — tous cohérents. Vérif de non-régression V10 : Psychic V10 montre ~0 différence (no-op confirmé), Heavy V10 inchangé (+0.50 comme avant). Aucune erreur console sur Simulator/Synergy Matrix/Keywords dans les deux éditions.

### Cover
- V10 : +1 à la sauvegarde du défenseur. Impl. actuelle : `simulation.js:128` et `:281`, `if (ctx.cover && !hasIgCover) armorSv -= 1`.
- V11 : **-1 à la CB (BS) de l'attaquant** à la place — passe donc de la phase Save à la phase Hit.
- Stealth + Cover ne se cumulent pas (malus max -1, pas d'empilement).
- **Nouveau (source vidéo) : les MONSTRES et VÉHICULES ne bénéficient plus du Cover du tout en V11** (ils en bénéficiaient en V10). À vérifier si c'est une règle générale officielle ou un raccourci du vidéaste — mais l'exemple est explicite et répété (Repulsor sans cover).
- Impact code : déplacer `ctx.cover` de la phase Save vers HIT_MODIFIER (phase Hit) ; conditionner l'éligibilité du bonus au(x) keyword(s) MONSTER/VEHICLE de la cible si confirmé.

### Plunging Fire — implémenté (2026-07-01)
Correction par rapport à la note précédente (qui donnait "V10 = +1 AP" d'après la vidéo) : source plus détaillée fournie par l'utilisateur, à privilégier.
- **V11 (règle universelle, nouvelle)** : si TOUTES les figurines de l'unité qui tire sont sur un élément de terrain ≥3" de hauteur et tirent sur une unité ennemie au niveau du sol → **+1 à la CB (hit roll)**. Contre efficacement le nouveau malus de Cover (-1 CB) ou permet de toucher plus facilement des cibles à découvert.
- **V11, unités IMPOSANTES/Towering** (ex. Chevaliers Impériaux) : bénéficient du même bonus sans condition de hauteur, dès lors que la cible au sol est à ≤12" — une figurine assez grande "voit par-dessus" sans avoir besoin d'être sur du terrain élevé.
- **V10** : **pas de bonus universel**. La hauteur ne servait qu'à la gestion des lignes de vue (ignorer certains masquages / voir par-dessus des décors) ; un "vrai" Tir Plongeant façon V11 n'existait qu'au cas par cas via des règles de faction ou des capacités d'unité spécifiques (pas dans le corpus de règles de base).
- **Décision d'implémentation** : ajouter un keyword/contexte `PLUNGING_FIRE` **dans les deux éditions** — en V10 il sert à modéliser les capacités spécifiques de faction/unité qui donnent cet effet (à activer manuellement au cas par cas, pas une règle universelle) ; en V11 c'est une règle générique activable pour n'importe quelle unité en hauteur. Le calcul moteur (+1 au jet pour toucher) est identique dans les deux moteurs — seule la justification/l'applicabilité change, même principe que Heavy (voir plus bas).
- Le 12" pour les unités Imposantes n'est pas une distance trackée par le moteur (comme Half Range, Attacker Moved, etc. — approximé par un simple toggle) ; documenté comme tel dans le tooltip plutôt que modélisé littéralement.

**Implémentation (2026-07-01)** :
- `simulation.js` + `simulation_v11.js` : nouveau contexte booléen `ctx.plunging_fire`, +1 au hit modifier (même formule que Heavy). Dans `simulation_v11.js`, ajouté côté `hitBonus` (donc Psychic le garde, cohérent avec Heavy).
- `keywords.js` + `keywords_v11.js` : nouvelle entrée `PLUNGING_FIRE`, nouveau **groupe `context`** (ni un mot-clé d'arme attachable via le chip picker, ni une mécanique de sauvegarde — une condition de positionnement du tireur, comme Cover). Exclu de `KW_GROUPS`/`SIMPLE_KW_TYPES` comme `save`.
- `KeywordsPage.jsx` : nouvelle section "Context" dans `SECTIONS`, nouveau scénario `PLUNGING_FIRE` dans `SCENARIOS` pour la démo live.
- `DefenderPanel.jsx` : nouveau toggle "Plunging Fire" dans le bloc Context, libellé edition-aware (au passage, le libellé du toggle Cover existant est aussi devenu edition-aware — bonus cohérent avec le fait que son mécanisme diffère déjà entre V10/V11).
- `simulatorStore.js` : `plunging_fire: false` ajouté à `defaultContext`.
- **Testé** : page Keywords en navigateur réel, V10 (1.31→1.79 dmg moyen, +0.48) et V11 (1.37→1.72, +0.35) — cohérent dans les deux moteurs, 0 erreur console. Le toggle dans le Simulateur (`DefenderPanel.jsx`) suit un pattern strictement identique aux 4 autres toggles de contexte déjà fonctionnels — non testé bout en bout via le flow complet du Simulateur (drawer de sélection d'unité pas automatisable facilement en test headless), mais code revu manuellement.

### Heavy — texte officiel confirmé (extrait des données `vflam/wh40k-11e`, rule "Heavy")
> "In your Shooting phase, each time an attack is made with a [HEAVY] weapon, add 1 to the hit roll if all of the following apply to the attacking unit: That unit is unengaged. That unit was not set up on the battlefield this turn. No model in that unit has moved more than 3" this turn."
- V10 : +1 pour toucher seulement si l'unité est restée complètement immobile.
- V11 : +1 pour toucher si **(a)** l'unité est non engagée, **(b)** elle n'a pas été mise en jeu ce tour (exclut le Deep Strike du tour d'arrivée), **(c)** aucun modèle n'a bougé plus de 3" (confirme le seuil 7,5cm/3").
- Impact code : `keywords.js` (entrée HEAVY) + contexte `attacker_moved` dans `simulation.js` à revoir (seuil de distance + conditions "unengaged"/"pas arrivé ce tour" à modéliser si on veut être exhaustif, sinon simplifier à la distance seule comme actuellement pour Remained Stationary).

### Hazardous
- V10 : échec sur 1. V11 (source blog/vidéo) : échec sur **1 ou 2** (33,3%).
- La rule "Hazardous" dans les données `vflam/wh40k-11e` renvoie vers une section de règles core "hazard rolls (06.03)" non incluse dans ce repo (pas de seuil numérique dans le texte de la rule elle-même) — le seuil 1-ou-2 n'est donc **pas encore confirmé par cette source**, reste au niveau "blog/vidéo".
- Actuellement `implemented: false, notSimulated: true` (dégâts auto-infligés hors scope) — impact seulement si on décide un jour de le simuler.

### Psychic — texte officiel confirmé, ATTENTION divergence avec la source précédente
> "Each time an attack is made with a [PSYCHIC] weapon, you can ignore any or all modifiers to that attack's BS or WS characteristic and any or all modifiers to the hit roll. Attacks made with [PSYCHIC] weapons are known as psychic attacks."
- **Le texte officiel ne mentionne QUE les modificateurs de BS/WS et du jet pour toucher — PAS le jet pour blesser.** Ça contredit la source blog/vidéo précédente qui affirmait "ignore tous les malus aux jets pour toucher ET pour blesser". À trancher : cette source (données de jeu réelles) est probablement plus fiable qu'un résumé de blog, donc **Psychic n'impacterait que la phase Hit, pas la phase Wound**.
- Impact code : ignorer HIT_MODIFIER négatif (et tout debuff de BS) dans `simulation.js` — mais PAS WOUND_MODIFIER contrairement à ce qui était noté avant.

### Cleave (nouveau keyword) — formule officielle confirmée
> "This ability always takes the form [CLEAVE X]. Each time you gather attack dice for a [CLEAVE] weapon, if you only selected one target for all of that weapon's attacks, add X additional attack dice for every five models that were in the target unit in the Select Targets step (rounding down)."
- **Confirmé identique à Blast** : +X attaques par tranche de 5 figurines de la cible (arrondi au sol), avec la condition **cible unique** (une seule unité ciblée par toutes les attaques de cette arme ce tour — comme Blast). Vu dans les données réelles : ex. "Two-handed big choppa" (Ork) porte `Cleave 1`.
- Impact code : nouvelle entrée `keywords.js` (group `hit`, mêlée) + logique dans PHASE 1 de `simulation.js`, littéralement copiable depuis la logique BLAST existante.

### Stealth — confirmé toujours présent en V11
> "If every model in a unit has this ability, each time a ranged attack targets that unit, that unit has the benefit of cover against that attack."
- Répond à la question ouverte : oui, Stealth existe toujours et fonctionne comme en V10 (donne le bénéfice de couverture). Rappel : Stealth + Cover ne se cumulent pas (malus max -1 au tir, cf. 1.1).

### Close-Quarters / Pistol — mécanique CHANGÉE, pas qu'un renommage
> "[PISTOL] and [CLOSE-QUARTERS] are identical for all rules purposes. Units containing one or more models with a [CLOSE-QUARTERS] weapon can shoot using close-quarters shooting (10.06). When using another shooting type, for each model in that unit (excluding MONSTER/VEHICLE models), you can only select one of the following to make attacks with: One or more of its [CLOSE-QUARTERS] weapons. One or more of its other ranged weapons."
- **Ce n'est pas juste un renommage.** Le texte ne parle plus du tout de "tirer en portée d'engagement" (mécanique V10 de Pistol) — il s'agit d'une nouvelle mécanique de "close-quarters shooting" (type de tir distinct, section 10.06 non incluse ici) avec une règle d'exclusivité par modèle (un modèle choisit soit ses armes Close-Quarters, soit ses autres armes à distance, pas les deux). Les deux noms ("Pistol" et "Close-Quarters") coexistent dans les données actuelles, probablement une transition en cours côté BSData.
- Actuellement `notSimulated` dans `keywords.js` (positionnement hors scope) — reste vrai, mais la note explicative "identique à V10" doit être supprimée/corrigée si on documente ce keyword plus tard.

---

## 2. Keywords — ajouts / suppressions / renommages

| Keyword V10 | Keyword V11 | Changement mécanique ? | Notes |
|---|---|---|---|
| Pistol | Close-Quarters | **Oui, confirmé** — voir section 1 | Les deux noms coexistent encore dans les données `vflam/wh40k-11e` ; mécanique différente de V10 (pas juste un renommage) |
| Grenades | Explosives | Pas encore vu dans les données V11 | Aucun des deux mots n'apparaît dans `data/cache_v11/` (keywords ou rules) — à surveiller |
| Tank Shock | Crushing Impact | Pas encore vu dans les données V11 | Idem — hors scope moteur de toute façon (mécanique de charge véhicule) |
| — | **Cleave** (nouveau) | Oui — formule confirmée, voir section 1 | Vu en usage réel : "Two-handed big choppa" (Ork) = `Cleave 1`. **Implémenté** dans `simulation_v11.js` |
| Psychic | Psychic (devient réel) | Oui, mais portée plus limitée que prévu — voir section 1 | Ignore BS/WS + jet pour toucher seulement, PAS le jet pour blesser (contredit la source blog/vidéo). **Implémenté** dans `simulation_v11.js` |
| Heavy | Heavy (conditions précisées) | Oui côté règles, non côté code — voir section 1 | Texte officiel confirmé : distance 3" + unengaged + pas arrivé ce tour. Le calcul (+1 to hit) reste identique entre éditions, donc aucun changement dans `simulation_v11.js` |
| Hazardous | Hazardous (seuil à confirmer) | Seuil 1-ou-2 pas encore confirmé par les données de jeu | Toujours au niveau "blog/vidéo" uniquement |
| Fly | Fly (+ option "Take to the Sky") | Non — mouvement, hors scope moteur | Voir section 3 |
| Stealth | Stealth (inchangé) | Non | Confirmé toujours présent — voir section 1 |
| Plunging Fire (cas par cas, faction/unité) | Plunging Fire (règle universelle) | Oui — voir section 1 | **Implémenté** dans les deux moteurs (`ctx.plunging_fire`, +1 to hit), nouveau groupe `context` dans le registre |

---

## 3. Changements hors moteur (gameplay, pas de code de simulation)

### Terrain / objectifs
- Layouts de terrain standardisés par GW (fin de la disparité UKTC / WTC / format GW selon les orgas).
- Objectifs = zones de terrain physiques (Terrain Areas), plus de marqueurs 40mm abstraits.

### Détachements / construction de liste
- Système de Points de Détachement (PD) à répartir entre plusieurs détachements d'un même Codex (barème détaillé déjà noté précédemment : Incursion 2 PD, Strike Force 3 PD, etc.).
- Tag "Upgrade" : les améliorations, avant réservées aux Personnages, sont accessibles à des unités normales (max 3 unités non-Personnage).
- Rôle Leader/Support des Personnages fixé **à la construction de liste** (plus de flexibilité à choisir en début de partie comme en V10). Leader = optionnel dans une unité ; Support = obligé d'intégrer une unité "garde du corps".

### Stratagèmes / Battleshock
- Un seul stratagème par unité et par phase (restriction **par phase** : un stratagème utilisé en phase de charge n'empêche pas d'en utiliser un en phase de combat, ce sont deux phases distinctes).
- Battleshock persiste jusqu'à réussite d'un test en début de prochain tour (au lieu de disparaître en fin de tour) ; unité en Battleshock ne peut plus utiliser de stratagème.

### Hidden
- Infanterie / Bêtes / Nuées dans une zone de terrain, n'ayant pas tiré ce tour-ci ou le tour précédent, et sans ennemi dans leur "portée de détection" (base 15", augmentable par des capacités spécifiques à certaines factions) → inciblables.
- Perd le statut dès qu'elle tire.

### Charge
- Nouvelle séquence : le joueur déclare quelle unité charge, lance les 2D6, **puis** choisit parmi les cibles atteignables (au lieu de déclarer la/les cible(s) avant de lancer les dés comme en V10).
- Charge à plus de 6" de distance : nécessite désormais un **7+** (au lieu de 6+ en V10), car la portée d'engagement (2") n'est plus comptée dans la distance de charge.
- Portée d'engagement : 1" → 2".
- Les unités (même sans mot-clé FLY) peuvent désormais **traverser** la portée d'engagement adverse en mouvement, tant qu'elles ne terminent pas leur mouvement dedans (en V10, seul FLY permettait ça).
- Deep Strike : distance minimale 9" → 8" ; une charge réussie depuis les réserves nécessite toujours 9 sur 2D6 (sauf unités à Deep Strike <6", ex. démons / Terminators Death Guard, qui chargent désormais à 7 depuis les réserves).
- Heroic Intervention : se résout désormais **à la fin de la phase de charge** (au lieu d'être une réaction immédiate à la déclaration de charge) → supprime les tactiques de "bait" de l'intervention héroïque.

### Combat (Pile In / Fight / Consolidation)
- Pile In regroupé : toutes les unités des deux joueurs font leur mouvement de Pile In **en début** de phase de combat (au lieu d'un mouvement par activation individuelle).
- Fights First : le **joueur actif (chargeur)** active en premier ses unités Fights First (V10 : le joueur non-actif activait en premier, même contre le chargeur).
- Nouveau mouvement **Overrun** (~3"/7.5cm) : une unité de mêlée ayant détruit sa cible peut avancer pour engager une nouvelle cible, en dehors du Pile In classique (utile car le Pile In normal est déjà consommé en début de phase).
- Consolidation regroupée en **fin** de phase de combat pour toutes les unités (symétrique au Pile In).
- Il n'est plus obligatoire de finir "socle à socle" pendant le Pile In/Charge (V10 forçait le contact socle-à-socle si possible, ce qui permettait de repositionner/bloquer des figurines) — il faut désormais finir engagé (< portée d'engagement) si possible, sans obligation de contact strict. Combiné à l'augmentation de la portée d'engagement, ça réduit les mouvements de repositionnement abusifs ("essuie-glace").

### Fly — nouvelle option "Take to the Sky"
- Une unité FLY peut, avant un mouvement normal/Advance/Fall Back/Charge, "prendre les airs" : -2 à sa caractéristique de Mouvement, mais ignore toutes les distances verticales pour traverser décors, figurines ennemies (y compris Monstres/Véhicules).
- Change beaucoup la mobilité des Monstres/Véhicules volants (l'infanterie volante n'était de toute façon pas gênée par la verticalité).

### Débarquement
- Si le transport est détruit en combat, les occupants peuvent désormais débarquer directement **en portée d'engagement** (plus de débarquement d'urgence à 6" avec risque de blessures mortelles sur des 1 comme en V10).

---

## 4. Impact sur la pipeline de données (BSData)

- Codex V10 valides au lancement → `pipeline/fetch_bsdata.py` (repo `BSData/wh40k-10e`) reste utilisable à court terme.
- Renommages keywords (Pistol/Grenades/Tank Shock) impacteront `mapKeywords()` le jour où BSData suit — prévoir table de mapping ancien→nouveau nom.

### Repo communautaire V11 identifié : `vflam/wh40k-11e`
- URL : https://github.com/vflam/wh40k-11e — mêmes créateurs que BSData/wh40k-10e. Créé le 2026-06-18, dernier push 2026-06-29. Probable brouillon avant adoption officielle par l'org BSData (le README pointe encore vers des badges `BSData/wh40k-11e`).
- **Même schéma BattleScribe** que la V10 (`catalogue`/`gameSystem`, `sharedSelectionEntryGroups`, `selectionEntries`, `profiles`, `characteristics`, `constraints`, `modifiers`... — `xmlns` identique `battlescribe.net/schema/catalogueSchema`).
- **Format de fichier différent** : au lieu de `.cat`/`.gst` en XML zippés, un **fichier `.json` par faction** à la racine du repo (`Necrons.json`, `Orks.json`, etc. + `Warhammer 40,000.json` pour le gameSystem/.gst). Le JSON est une sérialisation directe du même arbre (`{"catalogue": {...}}` / `{"gameSystem": {...}}`).
- `parse_bsdata.py` repose entièrement sur 4 helpers (`strip_ns`, `iter_tag`, `find_tag`, `attr`) + `.text`/`.tag` d'ElementTree — la logique métier (extraction armes/unités/abilities/weapon options) est déjà bien isolée derrière eux.

### Pipeline de staging construite et fonctionnelle (2026-07-01)
Décision initiale : pipeline isolée (pas de CI/CD, pas de code partagé avec V10, rien dans `frontend/public/`).
- `pipeline/fetch_bsdata_v11.py` — télécharge `vflam/wh40k-11e`, filtre `*.json` → `data/raw_v11/` (46 fichiers, ~68 MB). Fonctionne.
- `pipeline/parse_bsdata_v11.py` — adaptateur `JsonNode` (option 1 retenue : imite l'interface `ET.Element`, tag dérivé de la clé plurielle du conteneur parent, ex. `characteristics`→`characteristic`, `sharedRules`→`rule`). ~95% de la logique de `parse_bsdata.py` copiée telle quelle. Tourne sans erreur → **1706 unités, 6414 armes, 36 règles, 45 factions** (échelle comparable à la V10 : 1495 unités/3561 armes).
- `pipeline/build_frontend_data_v11.py` — slimming identique à `build_frontend_data.py`, sortie dans `data/frontend_preview_v11/` (4031 armes dédupliquées, 1706 unités).
- Sortie intermédiaire `data/cache_v11/{units,weapons,factions,rules,faction_units}.json` — gitignored (régénérable via les 2 premiers scripts).

### Évolution (2026-07-01, même jour) : preview live sur le site avec sélecteur V10/V11
Décision mise à jour : au lieu de rester purement en staging local, le premier jeu de données V11 est maintenant **copié dans `frontend/public/data/v11/`** (tracké git, buildé/déployé par le `ci-cd.yml` existant comme n'importe quel asset de `public/`) pour permettre une comparaison visuelle immédiate sur le site.
- `frontend/src/store/dataStore.js` : ajout d'un champ `edition` ('v10'/'v11', persisté en `localStorage`), `setEdition()` qui refetch `units.json`/`weapons.json`/`factions.json` depuis `/data` (v10, chemin inchangé) ou `/data/v11` (nouveau). Aucune régression sur le chemin V10 par défaut.
- `frontend/src/components/Navbar.jsx` : toggle "V10 / V11" ajouté à côté du logo (desktop) et en haut du menu mobile.
- Testé en local (dev server + Playwright headless) : bascule V10→V11 fonctionne sans erreur console, `FactionsPage` reflète bien des comptes différents par faction (ex. Imperium : 650 unités en V10 vs 682 en V11 ; Adepta Sororitas 41→46, Agents of the Imperium 49→66). Confirme que le parsing V11 est du même ordre de grandeur que la V10, avec des différences plausibles (roster pas encore identique, dataset V11 encore en rodage).
- **Le moteur de simulation reste 100% V10** (`simulation.js`/`keywords.js` inchangés) — sélectionner V11 change seulement quelles unités/armes s'affichent, pas les règles de calcul. Les chiffres du Simulateur en mode V11 ne reflètent PAS encore les règles V11 (Cover, Heavy, etc. — voir section 1) tant que le moteur n'est pas patché.
- Pas de nouveau workflow CI (pas de sync automatique V11 pour l'instant) — le premier jeu de données a été copié manuellement ; un futur `sync_bsdata_v11.yml` pourra être ajouté une fois le dataset V11 jugé assez stable pour être rafraîchi automatiquement.

### Synchronisation automatique V11 (2026-07-02)
`.github/workflows/sync_bsdata.yml` (cron toutes les 12h, déjà utilisé pour la V10) étendu avec une suite de steps V11 séquentiels après ceux de la V10 (même job, pas de nouveau workflow séparé — évite tout risque de race sur le push git) : fetch → parse → build → copie dans `frontend/public/data/v11/` → audit → commit séparé (`chore: sync BSData V11 [...]`), chacun gated sur son propre `steps.fetch_v11.outputs.updated`.
- `data/version_v11.json` retiré du `.gitignore` — doit être tracké en git pour que `fetch_bsdata_v11.py` puisse comparer le dernier SHA synchronisé d'un run CI à l'autre (même rôle que `data/version.json` pour la V10). Pas de `data/cache_stable_v11/` : `parse_bsdata_v11.py` écrit directement dans `data/cache_v11/`, lu directement par `build_frontend_data_v11.py`.
- `pipeline/audit.py` : `CACHE_DIR` paramétré en `--cache-dir` (défaut inchangé pour V10) pour pouvoir auditer `data/cache_v11/` avec exactement les mêmes checks.
- **Bug trouvé et corrigé en testant l'audit sur les vraies données V11** : `parse_bsdata_v11.py` lisait la caractéristique de sauvegarde via la clé `"SV"` (majuscules, convention V10) — mais le catalogue `vflam/wh40k-11e` la nomme `"Sv"` (v minuscule). Résultat : **1512 unités sur 1706 avaient leur Save silencieusement à `-`/manquant** (`Sv: 0` dans les données déjà commitées). Corrigé avec un fallback `chars.get("SV") or chars.get("Sv", "-")`. Après fix : 50 erreurs restantes (contre 1512), essentiellement des Aircraft avec OC vide (probablement légitime, comme "M" vide pour les fortifications) et quelques unités multi-profils à creuser plus tard.
- L'audit V11 est configuré en `continue-on-error: true` (contrairement à celui de la V10, strict) : le dataset communautaire V11 est encore jeune et il resterait probablement toujours quelques erreurs mineures — on ne veut pas qu'un audit qui ne passe jamais à 100% bloque indéfiniment toute synchronisation. Les résultats restent visibles dans les logs du job pour suivi.
- Testé en local avec les vraies données (le repo `vflam/wh40k-11e` avait d'ailleurs un nouveau commit depuis le dernier sync manuel — bon test grandeur nature de la détection incrémentale) : fetch/parse/build/audit tournent sans erreur, données rechargées dans `frontend/public/data/v11/` avec le fix Sv appliqué (vérifié sur "Dire Avengers" et "Asurmen" : Save désormais correct au lieu de `0`).

### Stratagèmes/améliorations/détachements V11 — source confirmée (2026-07-02)
Même repo GitHub que la V10 (`game-datacards/datasources`), qui a un dossier `11th/gdc/` en plus de `10th/gdc/`. Vérifié avec de vraies données (Necrons : 12 détachements, 63 stratagèmes, 42 améliorations, tag `"source": "40k-11e"`).
- **Différences de schéma vs V10** : champs texte (`name`, `target`, `when`, `effect`, `restrictions`, `description`) désormais des objets multilingues `{"en": "...", "fr": "...", ...}` au lieu de strings ; `is_subfaction` a disparu (toujours `null`), remplacé par la présence de `parent_name` ; noms d'amélioration incluent "(Upgrade)" directement dans le texte (confirme le renommage déjà noté en section 3) ; pas de champ coût en PD sur les détachements dans cette source.
- **Pas de stratagèmes universels/core publiés pour l'instant** : `11th/gdc/core.json` → 404 confirmé. Les 4 fichiers dans `11th/gdc/core/` (`chapter_approved.json`, `combat_patrol.json`, `core_rules.json`, `event_companion.json`) sont des documents de règles/missions (structure `sections`), pas des stratagèmes structurés. Aucun stratagème universel caché dans les fichiers de faction non plus (vérifié sur Necrons). Les stratagèmes universels existent bien dans les règles V11 (Command Re-roll etc.), juste pas encore publiés en données structurées par cette source.
- **`pipeline/fetch_gamedatacards_v11.py`** (nouveau, script manuel — pas encore dans `sync_bsdata.yml`, à ajouter plus tard une fois le premier résultat validé) : fork de `fetch_gamedatacards.py` avec un helper `text()` qui déballe les objets multilingues (`.get("en", "")`, robuste aussi aux strings brutes), `is_subfaction` dérivé de `bool(parent_name)`, `core_stratagems: []` avec un message explicite dans les logs. SKIP list : `keywords.json`, `faqs.json`, `titan.json` (vide, sans stratagème). Sortie : `frontend/public/data/gdc_v11.json` (28 factions, 996 KB). Testé en local, unwrapping vérifié correct sur Necrons/Cryptek Conclave.
- **`DetachmentsPage.jsx`** rendue edition-aware : charge `/data/gdc.json` ou `/data/gdc_v11.json` selon `useDataStore().edition`, re-fetch + reset de la sélection au changement d'édition (IDs de faction non partagés entre les deux sources). Le panneau "Core Stratagems" affiche un message explicite plutôt qu'une liste vide silencieuse quand `core_stratagems` est vide en V11. Testé en navigateur réel : bascule V10↔V11 fonctionnelle, Necrons V11 affiche bien 12 détachements avec le bon décompte de stratagèmes/améliorations par détachement, sous-factions (Black Templars, Blood Angels, Dark Angels, Deathwatch, Space Wolves) correctement groupées sous leur parent "Adeptus Astartes", 0 erreur console.

### Rendu du markup (2026-07-02)
Le texte des stratagèmes/améliorations V11 contient du markup HTML (`<k>`, `<b>`, `<i>`, `<u>`, `<ul><li>`), en plus du markdown `**bold**` déjà présent (8266 occurrences sur les données V11, 750 sur la V10). Rien de tout ça n'était rendu — `DetachmentsPage.jsx` affichait le texte brut, donc les balises apparaissaient littéralement à l'écran.
- Une convention existait déjà : `frontend/src/components/AbilityText.jsx` parse `**bold**`/`^^highlight^^` (le markup natif des descriptions d'unités BSData) en JSX stylé (couleur accent + gras), déjà utilisé sur `SimulatorPage`/`FactionsPage`. Pas réutilisé sur `DetachmentsPage` jusqu'ici.
- **Décision** : plutôt que d'inventer un second système de rendu pour les balises HTML, `pipeline/fetch_gamedatacards_v11.py` les convertit en amont vers la même convention : `<k>` → `^^…^^`, `<b>`/`<i>`/`<u>` → `**…**`, `<ul><li>` → puces `■` (déjà la convention native des deux sources pour les listes manuelles, ex. "■ Incursion - 2" dans les abilities BSData). Un filet de sécurité retire toute balise résiduelle non reconnue plutôt que de la laisser fuiter dans le texte affiché. Zéro changement necessaire côté `AbilityText.jsx`.
- `DetachmentsPage.jsx` : `strat.when/target/effect/restrictions`, `enh.description` et le texte des Army Rules passent maintenant par `<AbilityText>`, avec `white-space: pre-wrap` pour que les puces générées s'affichent sur des lignes séparées. Corrige la V11 (balises HTML) **et** la V10 au passage (750 `**bold**` bruts déjà en prod, même composant/page).
- Testé sur un cas réel avec liste imbriquée : "Nightforged Battery (Upgrade)" (Dark Angels → Darkflight Pursuit) — `<k>Land Speeder Vengeance</k> unit only. This unit can re-roll: <ul><li>Rolls to determine the <b>A</b> of a weapon.</li><li><b>Hazard rolls</b>.</li></ul>` s'affiche maintenant avec "Land Speeder Vengeance"/"A"/"Hazard rolls" en surbrillance et les deux puces sur des lignes séparées. Vérifié en navigateur réel (V10 et V11), aucune balise brute (`<k>`, `<b>`, `**`, `^^`) ne fuite dans le texte affiché, 0 erreur console.

---

## 5. Impact UI / contenu

- `keywords.js` : mettre à jour rule/note/tip pour HEAVY (conditions précisées), PSYCHIC (portée réduite : hit seulement) ; ajouter CLEAVE (formule confirmée = Blast en mêlée). HAZARDOUS reste non simulé, texte inchangé tant que le seuil 1-ou-2 n'est pas confirmé par une source fiable.
- Toggle contexte "Remained stationary" (Heavy) → doit refléter un seuil de distance (≤7,5cm) plutôt qu'un booléen "immobile" (+ éventuellement les conditions "unengaged"/"pas arrivé ce tour" si on va jusqu'au bout du texte officiel).
- Toggle contexte `cover` → redocumenter comme malus CB attaquant (pas bonus save défenseur), potentiellement conditionné à un keyword MONSTER/VEHICLE absent chez la cible.
- SEO/branding : mentions "V11 / 11th edition" (déjà noté dans `V11_NOTES.txt`).

### Séparation des armées V10/V11 (2026-07-01)
Problème identifié : les armées sauvegardées embarquent un instantané complet des unités (stats + refs d'armes) sans notion d'édition — une armée créée en V10 devenait silencieusement cassée si on la consultait en V11 (IDs d'armes qui ne correspondent à rien dans l'autre catalogue BattleScribe).
- `backend/models.py` : colonne `edition` (`'v10'`/`'v11'`, défaut `'v10'`) ajoutée au modèle `Army`, fixée à la création, jamais modifiable ensuite.
- `backend/main.py` : migration auto au démarrage (`ALTER TABLE armies ADD COLUMN IF NOT EXISTS edition ... DEFAULT 'v10'`) — même pattern que les migrations `users` existantes, non destructif, les armées existantes deviennent `v10`.
- `backend/routes/armies.py` : `POST /armies` enregistre l'édition courante ; `GET /armies?edition=` filtre côté serveur.
- `frontend/src/store/armyStore.js` : cache `init()` invalidé par `(user, édition)` ; `create()` tague la nouvelle armée ; **pour les invités (localStorage)**, correction d'un bug de fond potentiel — l'ancien `lsSave()` écrasait tout le localStorage avec seulement les armées de l'édition affichée, ce qui aurait supprimé silencieusement les armées de l'autre édition à la moindre modification. Remplacé par `lsSaveForEdition()` qui fusionne avec les armées de l'autre édition déjà sur disque.
- `ArmiesPage.jsx` et `AttackerPanel.jsx` (sélecteur d'armée dans le Simulateur) : re-fetch au changement d'édition, reset propre de la sélection si l'armée active n'existe plus dans la liste filtrée.
- **Testé** : le chemin invité/localStorage en navigateur réel (créer une armée par édition, basculer, vérifier qu'aucune ne fuite vers l'autre, vérifier la fusion localStorage) — comportement correct, 0 erreur console. Le chemin backend/Postgres réel (migration + endpoints) n'a pas pu être testé en sandbox (pas de Docker/Postgres disponible), vérifié seulement par relecture + `flake8` + compilation Python — **confirmé fonctionnel en prod par l'utilisateur après déploiement**.

### Cache HTTP sur `data/*.json` (2026-07-01)
Symptôme rapporté : après un changement d'édition (ou une mise à jour de données), il fallait un hard refresh (Ctrl/Cmd+Shift+R) pour voir les nouvelles données — un rechargement normal (F5) ne suffisait pas.
- Cause : `units.json`/`weapons.json`/`factions.json` (V10 et V11) gardent un nom de fichier stable d'un build à l'autre (contrairement aux JS/CSS hashés par Vite). Le sync S3 (`ci-cd.yml`) ne fixait aucun `Cache-Control` → CloudFront appliquait son TTL par défaut (~24h) et le navigateur mettait en cache la réponse pour la même durée, sans jamais revalider (un F5 normal respecte le cache HTTP ; seul un hard refresh l'ignore).
- Fix : `ci-cd.yml` sync maintenant `data/*` séparément avec `Cache-Control: no-cache, must-revalidate` (revalidation systématique, sans casser le cache long des assets hashés). Comme le build est refait à zéro à chaque run CI, les fichiers `data/*.json` ont un nouveau timestamp local à chaque déploiement donc `aws s3 sync` les re-uploade avec le nouvel en-tête automatiquement — pas d'étape de migration supplémentaire nécessaire.

### Bug ArmyPicker : sélection d'armée jamais réappliquée après changement d'édition (2026-07-01)
Symptôme rapporté : sur la page Simulator, onglet "From Army", changer d'édition faisait apparaître le nom de la nouvelle armée dans le menu déroulant mais la liste SQUAD restait vide — sans rapport avec le cache HTTP cette fois.
- Cause : la logique de reset (`AttackerPanel.jsx`, composant `ArmyPicker`) séparait "vider la sélection obsolète" et "resélectionner la première armée de la nouvelle liste" en deux branches du même `useEffect(..., [armies])`. Une fois la sélection vidée dans un rendu, rien ne redéclenchait l'effet pour exécuter la seconde branche (l'effet ne réagit qu'aux changements de `armies`, pas de `armyId`) — le menu déroulant affichait une armée par défaut du navigateur (rendu non contrôlé), mais en interne `armyId` restait vide, donc `army` était `null` et la section SQUAD ne s'affichait pas.
- Fix : les deux étapes fusionnées en une seule mise à jour d'état (`setArmyId(armies[0]?.id ?? '')`) dans la même exécution de l'effet.
- **Testé et confirmé** : en local (créer une armée par édition avec unité, basculer dans les deux sens) et en prod par l'utilisateur.

---

## 6. Questions ouvertes / à vérifier

- ~~Cleave : formule exacte~~ → **Résolu** : identique à Blast (+X/5 figurines, cible unique), confirmé par le texte de règle dans `vflam/wh40k-11e`.
- ~~Stealth existe-t-il toujours en V11 ?~~ → **Résolu** : oui, inchangé (bénéfice de couverture si tout le squad a l'ability).
- ~~Psychic : divergence entre sources~~ → **Tranché** : implémenté selon le texte de règle (`vflam/wh40k-11e`, hit-only) plutôt que le résumé blog/vidéo — voir section 1. À revoir si une source plus fiable contredit ça plus tard.
- **Close-Quarters/Pistol** : confirmé que ce n'est PAS qu'un renommage — nouvelle mécanique "close-quarters shooting" avec exclusivité par modèle. Detail exact de la section 10.06 (référencée mais absente du texte extrait) à creuser si on modélise un jour ce keyword.
- **Hazardous** : seuil 1-ou-2 toujours pas confirmé par une source fiable (renvoie vers une section "hazard rolls 06.03" non incluse dans les données). Reste à vérifier.
- Cover nul pour Monstres/Véhicules : toujours pas confirmé par les données de jeu (rien trouvé dans `rules.json` sur ce point) — reste au niveau vidéo seul. À chercher plus spécifiquement (peut-être dans le texte de la règle Cover elle-même, pas encore localisée/nommée dans nos extractions).
- Plunging Fire : condition de hauteur exacte (≥7,5cm/3" mentionné dans une source antérieure) — pas encore recoupée avec les données de jeu (pas trouvée dans `rules.json`, peut-être core rule non capturée dans `sharedRules`).
- Grenades/Explosives, Tank Shock/Crushing Impact : ni l'un ni l'autre des deux noms n'apparaît dans les données V11 actuelles — impossible de confirmer pour l'instant.
- BSData V11 officiel (org `BSData/wh40k-11e`) : toujours pas de repo officiel confirmé — `vflam/wh40k-11e` reste la seule source, à re-vérifier périodiquement si elle est adoptée/migrée.
- Toutes les infos restent issues de sources communautaires (blog, vidéo YouTube, dataset communautaire non estampillé GW) — à confirmer contre le rulebook GW officiel avant implémentation définitive du moteur.

---

## Historique des mises à jour de ce document

- Création du document.
- 2026-07-01 : ajout de la 1ère vague de données (article récapitulatif : structure de tour, charge, couvert, détachements/PD, stratagèmes, keywords renommés/nouveaux, terrain/objectifs) + 2ème vague (transcript vidéo Creative Wargame : détail Cover monstres/véhicules, Plunging Fire, séquence de charge affinée, traversée de portée d'engagement, Overrun, Fly/Take to the Sky, débarquement en engagement, Heroic Intervention). Sources non officielles.
- 2026-07-01 : identification du repo communautaire `vflam/wh40k-11e` (même schéma BattleScribe que la V10, mais JSON au lieu de XML .cat/.gst). Décision : pipeline de staging isolée. Construction de `fetch_bsdata_v11.py` + `parse_bsdata_v11.py` (adaptateur JsonNode) → 1706 unités/6414 armes/36 règles extraites avec succès. Exploitation du texte de règles réel pour confirmer/corriger plusieurs points : Cleave (formule = Blast confirmée), Stealth (toujours présent), Heavy (conditions précisées), Psychic (portée plus limitée que prévu — hit seulement, pas wound), Close-Quarters/Pistol (vraie mécanique différente, pas qu'un renommage).
- 2026-07-01 : premier jeu de données V11 copié dans `frontend/public/data/v11/`, sélecteur V10/V11 ajouté dans la navbar (`dataStore.js` + `Navbar.jsx`), page Keywords rendue edition-aware (`keywords_v11.js`). Pushé et testé en prod.
- 2026-07-01 : moteur de simulation V11 codé (`simulation_v11.js`, fork de `simulation.js`) — Cover déplacé en malus de tir, Psychic implémenté (hit-only), Cleave ajouté (= Blast en mêlée), Heavy laissé inchangé (aucun impact sur le calcul). Branché dans SimulatorPage, Synergy Matrix et Keywords (démos live désormais réellement différentes entre éditions). Testé en local sans régression V10.
- 2026-07-01 : séparation des armées sauvegardées par édition (colonne `edition` sur `Army`, migration auto, filtrage `GET /armies?edition=`, `armyStore.js` edition-aware côté front + fix d'un bug de fusion localStorage au passage). Chemin invité testé en navigateur réel ; chemin backend/Postgres confirmé fonctionnel en prod par l'utilisateur après déploiement.
- 2026-07-01 : fix cache HTTP sur `data/*.json` (`Cache-Control: no-cache` dans `ci-cd.yml`, plus besoin de hard refresh pour voir les nouvelles données) + fix bug ArmyPicker (la sélection d'armée ne se réappliquait jamais correctement après un changement d'édition — logique de reset fusionnée en une seule étape). Les deux confirmés fonctionnels en prod par l'utilisateur.
- 2026-07-01 : Plunging Fire précisé (règle universelle V11 confirmée : +1 to hit si tireur ≥3" de haut vs cible au sol, ou Towering ≤12") et implémenté dans les deux moteurs + les deux registres de keywords (nouveau groupe `context`) + page Keywords + Simulateur. Testé en local sur la page Keywords (V10 et V11), cohérent dans les deux éditions.
- 2026-07-02 : synchronisation automatique V11 ajoutée à `sync_bsdata.yml` (cron 12h, même job que la V10, commit séparé, audit non bloquant). Bug de parsing trouvé et corrigé au passage : `parse_bsdata_v11.py` cherchait la Save sous la clé `"SV"` alors que `vflam/wh40k-11e` la nomme `"Sv"` — 1512 unités sur 1706 avaient une Save manquante silencieusement. `frontend/public/data/v11/` republié avec les valeurs corrigées.
- 2026-07-02 : source stratagèmes/améliorations/détachements V11 confirmée (`game-datacards/datasources`, dossier `11th/gdc/`) — pas de stratagèmes universels publiés pour l'instant (`core.json` en 404, vérifié). `pipeline/fetch_gamedatacards_v11.py` créé (manuel, pas encore dans le cron) avec déballage des champs multilingues et détection de sous-faction via `parent_name`. `DetachmentsPage.jsx` rendue edition-aware, testée en navigateur réel sur V10 et V11.
- 2026-07-02 : rendu du markup HTML (`<k>`, `<b>`, `<ul><li>`, etc.) des stratagèmes/améliorations V11 — converti côté python vers la convention `**bold**`/`^^highlight^^`/`■` déjà supportée par `AbilityText.jsx` (existant, jusqu'ici inutilisé sur la page Detachments). Corrige aussi la V10 au passage (même composant/page, 750 `**bold**` bruts déjà en prod). Testé sur un cas réel avec liste imbriquée, 0 erreur console.
