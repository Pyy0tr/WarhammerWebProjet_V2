# WH40K V11 — Changements confirmés

> Document de suivi tenu à jour au fur et à mesure que les changements V11 sont confirmés.
> Ne contient que des infos validées par l'utilisateur — pour les rumeurs/notes de travail antérieures au lancement, voir `V11_NOTES.txt`.

Dernière mise à jour : 2026-07-01
Sources jusqu'ici : (1) article récapitulatif V10 vs V11 (blog non officiel), (2) transcript vidéo YouTube "Creative Wargame", (3) données réelles du repo communautaire `vflam/wh40k-11e` (texte de règles embarqué dans le JSON — probablement la source la plus fiable des trois, mais reste un dataset communautaire non estampillé GW).

---

## 1. Changements impactant le moteur de simulation

Fichiers concernés : `frontend/src/engine/simulation.js`, `frontend/src/engine/keywords.js`.

### Cover
- V10 : +1 à la sauvegarde du défenseur. Impl. actuelle : `simulation.js:128` et `:281`, `if (ctx.cover && !hasIgCover) armorSv -= 1`.
- V11 : **-1 à la CB (BS) de l'attaquant** à la place — passe donc de la phase Save à la phase Hit.
- Stealth + Cover ne se cumulent pas (malus max -1, pas d'empilement).
- **Nouveau (source vidéo) : les MONSTRES et VÉHICULES ne bénéficient plus du Cover du tout en V11** (ils en bénéficiaient en V10). À vérifier si c'est une règle générale officielle ou un raccourci du vidéaste — mais l'exemple est explicite et répété (Repulsor sans cover).
- Impact code : déplacer `ctx.cover` de la phase Save vers HIT_MODIFIER (phase Hit) ; conditionner l'éligibilité du bonus au(x) keyword(s) MONSTER/VEHICLE de la cible si confirmé.

### Plunging Fire (indirectement lié au Cover)
- V10 : unité en hauteur tirant sur cible à l'étage inférieur → +1 à la pénétration d'armure (AP).
- V11 : devient **+1 à la CB (to-hit)** au lieu de +1 AP — compense exactement le nouveau malus de Cover (-1 CB) de la cible.
- Pas modélisé actuellement dans le moteur (pas de contexte d'élévation) — à garder en tête si un jour on ajoute un toggle "hauteur".

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
| — | **Cleave** (nouveau) | Oui — formule confirmée, voir section 1 | Vu en usage réel : "Two-handed big choppa" (Ork) = `Cleave 1` |
| Psychic | Psychic (devient réel) | Oui, mais portée plus limitée que prévu — voir section 1 | Ignore BS/WS + jet pour toucher seulement, PAS le jet pour blesser (contredit la source blog/vidéo) |
| Heavy | Heavy (conditions précisées) | Oui — voir section 1 | Texte officiel confirmé : distance 3" + unengaged + pas arrivé ce tour |
| Hazardous | Hazardous (seuil à confirmer) | Seuil 1-ou-2 pas encore confirmé par les données de jeu | Toujours au niveau "blog/vidéo" uniquement |
| Fly | Fly (+ option "Take to the Sky") | Non — mouvement, hors scope moteur | Voir section 3 |
| Stealth | Stealth (inchangé) | Non | Confirmé toujours présent — voir section 1 |

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

---

## 5. Impact UI / contenu

- `keywords.js` : mettre à jour rule/note/tip pour HEAVY (conditions précisées), PSYCHIC (portée réduite : hit seulement) ; ajouter CLEAVE (formule confirmée = Blast en mêlée). HAZARDOUS reste non simulé, texte inchangé tant que le seuil 1-ou-2 n'est pas confirmé par une source fiable.
- Toggle contexte "Remained stationary" (Heavy) → doit refléter un seuil de distance (≤7,5cm) plutôt qu'un booléen "immobile" (+ éventuellement les conditions "unengaged"/"pas arrivé ce tour" si on va jusqu'au bout du texte officiel).
- Toggle contexte `cover` → redocumenter comme malus CB attaquant (pas bonus save défenseur), potentiellement conditionné à un keyword MONSTER/VEHICLE absent chez la cible.
- SEO/branding : mentions "V11 / 11th edition" (déjà noté dans `V11_NOTES.txt`).

---

## 6. Questions ouvertes / à vérifier

- ~~Cleave : formule exacte~~ → **Résolu** : identique à Blast (+X/5 figurines, cible unique), confirmé par le texte de règle dans `vflam/wh40k-11e`.
- ~~Stealth existe-t-il toujours en V11 ?~~ → **Résolu** : oui, inchangé (bénéfice de couverture si tout le squad a l'ability).
- **Psychic** : divergence entre sources — le texte de règle (`vflam/wh40k-11e`) ne mentionne QUE BS/WS + jet pour toucher, pas le jet pour blesser, contrairement au résumé blog/vidéo. À trancher avant d'implémenter (privilégier la source données de jeu).
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
