"""
parse_bsdata.py
---------------
Parse tous les fichiers .cat / .gst BSData wh40k-10e
et produit des fichiers JSON structurés dans data/cache/.

Sortie :
    data/cache/factions.json   — liste des factions
    data/cache/units.json      — toutes les unités (stats, armes, abilities...)
    data/cache/weapons.json    — toutes les armes (dédupliquées)
    data/cache/rules.json      — règles universelles (.gst)

Usage :
    python pipeline/parse_bsdata.py
"""

import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_ROOT / "data" / "raw"
CACHE_DIR = PROJECT_ROOT / "data" / "cache"

# ---------------------------------------------------------------------------
# Helpers XML — suppression du namespace pour simplifier les sélecteurs
# ---------------------------------------------------------------------------

NS_CATALOGUE  = "http://www.battlescribe.net/schema/catalogueSchema"
NS_GAMESYSTEM = "http://www.battlescribe.net/schema/gameSystemSchema"


def strip_ns(tag: str) -> str:
    """'{http://...}tagname'  →  'tagname'"""
    return tag.split("}", 1)[-1] if "}" in tag else tag


def iter_tag(node, tag: str):
    """Itère sur les enfants directs dont le tag (sans NS) correspond."""
    for child in node:
        if strip_ns(child.tag) == tag:
            yield child


def find_tag(node, tag: str):
    """Retourne le premier enfant direct dont le tag correspond, ou None."""
    for child in node:
        if strip_ns(child.tag) == tag:
            return child
    return None


def attr(node, name: str, default=None):
    return node.attrib.get(name, default)


def is_hidden(node) -> bool:
    return attr(node, "hidden", "false").lower() == "true"


def is_legends(name: str) -> bool:
    return "[legends]" in name.lower()


def clean_name(name: str) -> str:
    """Retire le tag [Legends] du nom pour le stocker séparément."""
    return re.sub(r"\s*\[legends\]", "", name, flags=re.IGNORECASE).strip()


# ---------------------------------------------------------------------------
# Index global  {bsdata_id: ET.Element}
# ---------------------------------------------------------------------------

class GlobalIndex:
    """
    Charge tous les fichiers .cat et .gst et construit un index
    id → noeud XML pour toutes les définitions partagées.
    """

    def __init__(self):
        self._index: dict[str, ET.Element] = {}
        self._faction_of: dict[str, str] = {}  # bsdata_id → nom du fichier source

    def load_file(self, path: Path, faction_name: str):
        tree = ET.parse(path)
        root = tree.getroot()
        self._index_node(root, faction_name)

    def _index_node(self, node: ET.Element, faction_name: str):
        """Indexe récursivement tous les noeuds qui ont un attribut 'id'."""
        node_id = attr(node, "id")
        if node_id:
            self._index[node_id] = node
            self._faction_of[node_id] = faction_name
        for child in node:
            self._index_node(child, faction_name)

    def resolve(self, target_id: str):
        """Retourne le noeud correspondant à un targetId, ou None."""
        return self._index.get(target_id)

    def faction_of(self, node_id: str) -> str:
        return self._faction_of.get(node_id, "")


# ---------------------------------------------------------------------------
# Extraction des stats d'arme depuis un <profile>
# ---------------------------------------------------------------------------

def extract_weapon_profile(profile: ET.Element) -> dict | None:
    """
    Extrait les stats d'une arme depuis un <profile typeName="Ranged Weapons"|"Melee Weapons">.
    Retourne None si le profil n'est pas une arme.
    """
    type_name = attr(profile, "typeName", "")
    if type_name not in ("Ranged Weapons", "Melee Weapons"):
        return None

    chars = {}
    chars_node = find_tag(profile, "characteristics")
    if chars_node is not None:
        for c in iter_tag(chars_node, "characteristic"):
            chars[attr(c, "name", "")] = (c.text or "").strip()

    weapon_type = "Ranged" if type_name == "Ranged Weapons" else "Melee"
    skill_key = "BS" if weapon_type == "Ranged" else "WS"

    return {
        "bsdata_id": attr(profile, "id", ""),
        "name": attr(profile, "name", ""),
        "type": weapon_type,
        "range": chars.get("Range", "-"),
        "A": chars.get("A", "-"),
        "BS_WS": chars.get(skill_key, "-"),
        "S": chars.get("S", "-"),
        "AP": chars.get("AP", "-"),
        "D": chars.get("D", "-"),
        "keywords": [k.strip() for k in chars.get("Keywords", "").split(",") if k.strip()],
    }


# ---------------------------------------------------------------------------
# Extraction d'une ability depuis un <profile typeName="Abilities">
# ---------------------------------------------------------------------------

def extract_ability_profile(profile: ET.Element) -> dict | None:
    if attr(profile, "typeName", "") != "Abilities":
        return None

    name = attr(profile, "name", "")
    description = ""
    chars_node = find_tag(profile, "characteristics")
    if chars_node is not None:
        for c in iter_tag(chars_node, "characteristic"):
            if attr(c, "name", "") == "Description":
                description = (c.text or "").strip()

    is_invuln = name.lower() == "invulnerable save"
    return {
        "name": name,
        "description": description,
        "is_invuln_save": is_invuln,
        "invuln_value": description if is_invuln else None,
    }


# ---------------------------------------------------------------------------
# Extraction des stats d'unité depuis un <profile typeName="Unit">
# ---------------------------------------------------------------------------

def extract_unit_stats(profile: ET.Element) -> dict | None:
    if attr(profile, "typeName", "") != "Unit":
        return None
    chars = {}
    chars_node = find_tag(profile, "characteristics")
    if chars_node is not None:
        for c in iter_tag(chars_node, "characteristic"):
            chars[attr(c, "name", "")] = (c.text or "").strip()
    return {
        "M":  chars.get("M", "-"),
        "T":  chars.get("T", "-"),
        "SV": chars.get("SV", "-"),
        "W":  chars.get("W", "-"),
        "LD": chars.get("LD", "-"),
        "OC": chars.get("OC", "-"),
    }


# ---------------------------------------------------------------------------
# Extraction des stats de transport depuis un <profile typeName="Transport">
# ---------------------------------------------------------------------------

def extract_transport_profile(profile: ET.Element) -> dict | None:
    if attr(profile, "typeName", "") != "Transport":
        return None
    chars = {}
    chars_node = find_tag(profile, "characteristics")
    if chars_node is not None:
        for c in iter_tag(chars_node, "characteristic"):
            chars[attr(c, "name", "")] = (c.text or "").strip()
    return {"capacity": chars.get("Capacity", "-")}


# ---------------------------------------------------------------------------
# Collecte récursive des armes et abilities dans un noeud
# ---------------------------------------------------------------------------

def collect_from_profiles(node: ET.Element, weapons_out: list, abilities_out: list,
                           stats_out: list, transport_out: list):
    """Parcourt les <profiles> d'un noeud et remplit les listes de sortie."""
    profiles_node = find_tag(node, "profiles")
    if profiles_node is None:
        return
    for profile in iter_tag(profiles_node, "profile"):
        w = extract_weapon_profile(profile)
        if w:
            weapons_out.append(w)
            continue
        a = extract_ability_profile(profile)
        if a:
            abilities_out.append(a)
            continue
        s = extract_unit_stats(profile)
        if s:
            stats_out.append(s)
            continue
        t = extract_transport_profile(profile)
        if t:
            transport_out.append(t)


def collect_infolinks(node: ET.Element, index: GlobalIndex,
                      weapons_out: list, abilities_out: list,
                      stats_out: list | None = None):
    """Résout les <infoLinks> et extrait profils/règles/stats référencés."""
    info_links_node = find_tag(node, "infoLinks")
    if info_links_node is None:
        return
    for link in iter_tag(info_links_node, "infoLink"):
        target_id = attr(link, "targetId", "")
        target = index.resolve(target_id)
        if target is None:
            continue
        tag = strip_ns(target.tag)
        if tag == "profile":
            # Stats d'unité (ex: Soul Grinder)
            if stats_out is not None:
                s = extract_unit_stats(target)
                if s:
                    stats_out.append(s)
                    continue
            w = extract_weapon_profile(target)
            if w:
                weapons_out.append(w)
                continue
            a = extract_ability_profile(target)
            if a:
                abilities_out.append(a)
        elif tag == "rule":
            name = attr(target, "name", "")
            desc_node = find_tag(target, "description")
            abilities_out.append({
                "name": name,
                "description": (desc_node.text or "").strip() if desc_node is not None else "",
                "is_invuln_save": False,
                "invuln_value": None,
            })

    # infoGroups (T'au, etc.)
    info_groups_node = find_tag(node, "infoGroups")
    if info_groups_node is not None:
        for group in iter_tag(info_groups_node, "infoGroup"):
            collect_from_profiles(group, [], abilities_out, [], [])
            collect_infolinks(group, index, weapons_out, abilities_out)


# ---------------------------------------------------------------------------
# Collecte récursive des armes dans selectionEntries / selectionEntryGroups
# ---------------------------------------------------------------------------

def collect_weapon_options(node: ET.Element, index: GlobalIndex,
                            depth: int = 0) -> list[dict]:
    """
    Parcourt récursivement selectionEntryGroups et selectionEntries
    pour trouver toutes les armes disponibles pour une unité.
    Retourne une liste de groupes d'options.
    """
    if depth > 8:  # sécurité anti-boucle
        return []

    groups = []

    # --- selectionEntryGroups ---
    seg_node = find_tag(node, "selectionEntryGroups")
    if seg_node is not None:
        for seg in iter_tag(seg_node, "selectionEntryGroup"):
            group_name = attr(seg, "name", "")
            weapons_in_group = []
            sub_groups = []

            # contraintes du groupe
            min_sel, max_sel = _get_constraints(seg)

            # entryLinks dans ce groupe
            sub_weapons, sub_g = _collect_entry_links(seg, index, depth + 1)
            weapons_in_group.extend(sub_weapons)
            sub_groups.extend(sub_g)

            # selectionEntries dans ce groupe
            se_node = find_tag(seg, "selectionEntries")
            if se_node is not None:
                for se in iter_tag(se_node, "selectionEntry"):
                    w = _extract_weapon_from_entry(se, index, depth + 1)
                    if w:
                        weapons_in_group.extend(w)
                    # Si le SE est un model avec ses propres SEGs (ex: Deathwing Knights,
                    # Lychguard), récurser pour capturer ses weapon options internes
                    se_inner = collect_weapon_options(se, index, depth + 1)
                    if se_inner:
                        sub_groups.extend(se_inner)

            # récursion dans les sous-groupes du seg
            sub_g2 = collect_weapon_options(seg, index, depth + 1)
            sub_groups.extend(sub_g2)

            if weapons_in_group or sub_groups:
                groups.append({
                    "group_name": group_name,
                    "min_select": min_sel,
                    "max_select": max_sel,
                    "weapons": weapons_in_group,
                    "sub_groups": sub_groups,
                })

    # --- entryLinks directs (armes sans groupe explicite) ---
    direct_weapons, sub_g = _collect_entry_links(node, index, depth + 1)
    groups.extend(sub_g)
    if direct_weapons:
        groups.append({
            "group_name": "",
            "min_select": None,
            "max_select": None,
            "weapons": direct_weapons,
            "sub_groups": [],
        })

    return groups


def _get_constraints(node: ET.Element) -> tuple[int | None, int | None]:
    """Retourne (min, max) de selections depuis les <constraints>."""
    min_val = None
    max_val = None
    constraints_node = find_tag(node, "constraints")
    if constraints_node is not None:
        for c in iter_tag(constraints_node, "constraint"):
            if attr(c, "field", "") == "selections" and attr(c, "scope", "") in ("parent", "roster", "self"):
                try:
                    val = int(float(attr(c, "value", "0")))
                except ValueError:
                    val = None
                ctype = attr(c, "type", "")
                if ctype == "min" and min_val is None:
                    min_val = val
                elif ctype == "max" and max_val is None:
                    max_val = val
    return min_val, max_val


def _collect_entry_links(node: ET.Element, index: GlobalIndex,
                          depth: int) -> tuple[list, list]:
    """Résout les <entryLinks> et retourne (weapons, groups)."""
    weapons = []
    groups = []
    el_node = find_tag(node, "entryLinks")
    if el_node is None:
        return weapons, groups

    for link in iter_tag(el_node, "entryLink"):
        target_id = attr(link, "targetId", "")
        target = index.resolve(target_id)
        if target is None:
            continue
        tag = strip_ns(target.tag)
        if tag == "selectionEntry":
            w = _extract_weapon_from_entry(target, index, depth)
            if w:
                weapons.extend(w)
        elif tag == "selectionEntryGroup":
            # Traiter les SEs directes du SEG cible (ex: Terminator Weapons SEG)
            # collect_weapon_options ne traite que les SEGs imbriqués et entryLinks,
            # pas les selectionEntries directes du noeud passé en argument.
            seg_weapons = []
            seg_sub = []
            min_sel, max_sel = _get_constraints(link)
            seg_name = attr(target, "name", attr(link, "name", ""))

            se_inside = find_tag(target, "selectionEntries")
            if se_inside is not None:
                for se in iter_tag(se_inside, "selectionEntry"):
                    w = _extract_weapon_from_entry(se, index, depth + 1)
                    seg_weapons.extend(w)
                    se_opts = collect_weapon_options(se, index, depth + 1)
                    seg_sub.extend(se_opts)

            # Nested SEGs et entryLinks dans le SEG cible
            inner_groups = collect_weapon_options(target, index, depth + 1)
            seg_sub.extend(inner_groups)

            if seg_weapons or seg_sub:
                groups.append({
                    "group_name": seg_name,
                    "min_select": min_sel,
                    "max_select": max_sel,
                    "weapons": seg_weapons,
                    "sub_groups": seg_sub,
                })
    return weapons, groups


def _extract_weapon_from_entry(entry: ET.Element, index: GlobalIndex,
                                depth: int) -> list[dict]:
    """Extrait les armes d'une selectionEntry (type upgrade/model)."""
    weapons = []
    entry_name = attr(entry, "name", "")
    min_sel, max_sel = _get_constraints(entry)

    # Profils directs dans l'entrée
    profiles_node = find_tag(entry, "profiles")
    if profiles_node is not None:
        for profile in iter_tag(profiles_node, "profile"):
            w = extract_weapon_profile(profile)
            if w:
                w["option_name"] = entry_name
                w["min_count"] = min_sel
                w["max_count"] = max_sel
                weapons.append(w)

    # entryLinks → armes dans des shared entries
    el_node = find_tag(entry, "entryLinks")
    if el_node is not None:
        for link in iter_tag(el_node, "entryLink"):
            if attr(link, "type", "") != "selectionEntry":
                continue
            target_id = attr(link, "targetId", "")
            target = index.resolve(target_id)
            if target is None:
                continue
            sub = _extract_weapon_from_entry(target, index, depth + 1)
            weapons.extend(sub)

    # selectionEntries imbriquées
    if depth < 6:
        se_node = find_tag(entry, "selectionEntries")
        if se_node is not None:
            for se in iter_tag(se_node, "selectionEntry"):
                weapons.extend(_extract_weapon_from_entry(se, index, depth + 1))

    return weapons


# ---------------------------------------------------------------------------
# Extraction des keywords (categoryLinks)
# ---------------------------------------------------------------------------

def extract_keywords(node: ET.Element) -> list[str]:
    keywords = []
    cl_node = find_tag(node, "categoryLinks")
    if cl_node is not None:
        for cl in iter_tag(cl_node, "categoryLink"):
            name = attr(cl, "name", "")
            if name:
                keywords.append(name)
    return keywords


# ---------------------------------------------------------------------------
# Extraction du coût en points
# ---------------------------------------------------------------------------

def extract_pts(node: ET.Element) -> int:
    costs_node = find_tag(node, "costs")
    if costs_node is not None:
        for cost in iter_tag(costs_node, "cost"):
            if attr(cost, "name", "") == "pts":
                try:
                    return int(float(attr(cost, "value", "0")))
                except ValueError:
                    pass
    return 0


# ID du costType "pts" dans le .gst BSData wh40k-10e
_PTS_FIELD_ID = "51b2-306e-1021-d207"


def extract_pts_options(entry: ET.Element) -> list[dict]:
    """
    Extrait les options de coût par taille d'escouade depuis les <modifiers>.

    WH40K 10e stocke les pts comme modifiers conditionnels sur le champ pts :
      - type="set" field=<pts_field_id> value=X
        avec conditions equalTo/atLeast sur field="selections" childId="model"

    Retourne une liste triée de dicts :
      [{"n_models": N, "pts": P, "condition": "exact"|"atLeast"}, ...]
    """
    options = []
    modifiers_node = find_tag(entry, "modifiers")
    if modifiers_node is None:
        return options

    for mod in iter_tag(modifiers_node, "modifier"):
        if attr(mod, "type", "") != "set":
            continue
        if attr(mod, "field", "") != _PTS_FIELD_ID:
            continue
        try:
            pts_val = int(float(attr(mod, "value", "0")))
        except ValueError:
            continue

        # Lire la condition (equalTo / atLeast sur nombre de modèles)
        conditions_node = find_tag(mod, "conditions")
        if conditions_node is None:
            continue
        for cond in iter_tag(conditions_node, "condition"):
            ctype = attr(cond, "type", "")
            cfield = attr(cond, "field", "")
            child_id = attr(cond, "childId", "")
            if cfield != "selections" or child_id not in ("model", ""):
                # childId peut être un ID concret de sous-entrée type=model
                # on accepte tout childId non vide
                if not child_id:
                    continue
            try:
                n = int(float(attr(cond, "value", "0")))
            except ValueError:
                continue
            condition_type = "exact" if ctype == "equalTo" else "atLeast"
            options.append({"n_models": n, "pts": pts_val, "condition": condition_type})

    # Trier par n_models croissant
    options.sort(key=lambda x: x["n_models"])
    return options


# ---------------------------------------------------------------------------
# Recherche récursive des stats d'unité dans tout le sous-arbre
# ---------------------------------------------------------------------------

def _find_stats_recursive(node: ET.Element, index: GlobalIndex,
                           stats_out: list, depth: int = 0):
    """
    Cherche des stats d'unité (typeName="Unit") n'importe où dans le sous-arbre :
    - profils directs
    - infoLinks résolus
    - entryLinks résolus
    - selectionEntryGroups → selectionEntries → (récursion)
    S'arrête dès que des stats sont trouvées, ou à depth > 6.
    """
    if depth > 6 or stats_out:
        return

    # 1. Profils directs
    profiles_node = find_tag(node, "profiles")
    if profiles_node is not None:
        for profile in iter_tag(profiles_node, "profile"):
            s = extract_unit_stats(profile)
            if s:
                stats_out.append(s)
                return

    # 2. infoLinks → profils résolus
    il_node = find_tag(node, "infoLinks")
    if il_node is not None:
        for il in iter_tag(il_node, "infoLink"):
            target = index.resolve(attr(il, "targetId", ""))
            if target is not None:
                s = extract_unit_stats(target)
                if s:
                    stats_out.append(s)
                    return

    # 3. selectionEntries directs
    se_node = find_tag(node, "selectionEntries")
    if se_node is not None:
        for se in iter_tag(se_node, "selectionEntry"):
            _find_stats_recursive(se, index, stats_out, depth + 1)
            if stats_out:
                return

    # 4. selectionEntryGroups → selectionEntries
    seg_node = find_tag(node, "selectionEntryGroups")
    if seg_node is not None:
        for seg in iter_tag(seg_node, "selectionEntryGroup"):
            _find_stats_recursive(seg, index, stats_out, depth + 1)
            if stats_out:
                return

    # 5. entryLinks → résolution et récursion
    el_node = find_tag(node, "entryLinks")
    if el_node is not None:
        for el in iter_tag(el_node, "entryLink"):
            target_id = attr(el, "targetId", "")
            target = index.resolve(target_id)
            if target is not None:
                _find_stats_recursive(target, index, stats_out, depth + 1)
                if stats_out:
                    return


# ---------------------------------------------------------------------------
# Extraction complète d'une unité
# ---------------------------------------------------------------------------

def extract_unit(entry: ET.Element, faction: str, index: GlobalIndex) -> dict | None:
    """
    Extrait toutes les données d'une selectionEntry de type 'model' ou 'unit'.
    """
    entry_type = attr(entry, "type", "")
    if entry_type not in ("model", "unit"):
        return None

    raw_name = attr(entry, "name", "")
    legends = is_legends(raw_name)
    name = clean_name(raw_name)
    bsdata_id = attr(entry, "id", "")

    weapons: list[dict] = []
    abilities: list[dict] = []
    stats_list: list[dict] = []
    transport_list: list[dict] = []

    # 1. Profils directs
    collect_from_profiles(entry, weapons, abilities, stats_list, transport_list)

    # 2. infoLinks (références vers shared profiles/rules/stats)
    collect_infolinks(entry, index, weapons, abilities, stats_list)

    # 2b. Si pas de stats trouvées, descendre dans les selectionEntries (sub-models)
    #     Pattern A : selectionEntry type="unit" → selectionEntries → selectionEntry type="model"
    if not stats_list:
        sub_entries_node = find_tag(entry, "selectionEntries")
        if sub_entries_node is not None:
            for sub in iter_tag(sub_entries_node, "selectionEntry"):
                if attr(sub, "type", "") == "model":
                    collect_from_profiles(sub, weapons, abilities, stats_list, transport_list)
                    collect_infolinks(sub, index, weapons, abilities)
                    if stats_list:
                        break

    # 2c. Recherche récursive des stats dans tout le sous-arbre
    if not stats_list:
        _find_stats_recursive(entry, index, stats_list, depth=0)

    # 3. Options d'armes (selectionEntryGroups récursifs)
    weapon_options = collect_weapon_options(entry, index)

    # 3b. Descendre dans les selectionEntries (sub-models) pour leurs armes
    #     Pattern : unit → selectionEntries → model → selectionEntryGroups → armes
    #     Pattern : unit → selectionEntries → model → selectionEntries → upgrade → profiles (ex: Plaguebearers, Flamers)
    sub_entries_node = find_tag(entry, "selectionEntries")
    if sub_entries_node is not None:
        for sub in iter_tag(sub_entries_node, "selectionEntry"):
            # Profils directs du sub-model
            collect_from_profiles(sub, weapons, abilities, [], [])
            collect_infolinks(sub, index, weapons, abilities)
            # Options d'armes du sub-model (SEGs et entryLinks)
            sub_options = collect_weapon_options(sub, index)
            weapon_options.extend(sub_options)
            # Nested selectionEntries directes dans le sub-model
            # (type="upgrade" avec profils d'armes, ex: Plaguebearers/Flamers/Screamers)
            nested_se_node = find_tag(sub, "selectionEntries")
            if nested_se_node is not None:
                nested_weapons = []
                for nested_se in iter_tag(nested_se_node, "selectionEntry"):
                    w = _extract_weapon_from_entry(nested_se, index, 1)
                    nested_weapons.extend(w)
                if nested_weapons:
                    weapon_options.append({
                        "group_name": "",
                        "min_select": None,
                        "max_select": None,
                        "weapons": nested_weapons,
                        "sub_groups": [],
                    })

    # 4. Keywords
    keywords = extract_keywords(entry)

    # 5. Coût en pts
    pts = extract_pts(entry)
    # Options de coût par taille d'escouade (système WH40K 10e — pts via modifiers conditionnels)
    pts_options = extract_pts_options(entry)

    if pts_options:
        # Le pts de base (<costs>) correspond à la taille minimale.
        # Si base=0, prendre le minimum des options (ex: Ripper Swarms 1 model = 25 pts).
        if pts == 0:
            pts = min(o["pts"] for o in pts_options)
    else:
        # Fallback : certaines unités stockent les pts dans les sous-entrées (ex: War Walkers, Carnifexes)
        if pts == 0:
            sub_entries_node = find_tag(entry, "selectionEntries")
            if sub_entries_node is not None:
                for sub in iter_tag(sub_entries_node, "selectionEntry"):
                    sub_pts = extract_pts(sub)
                    if sub_pts > 0:
                        pts = sub_pts
                        break
            if pts == 0:
                seg_node = find_tag(entry, "selectionEntryGroups")
                if seg_node is not None:
                    for seg in iter_tag(seg_node, "selectionEntryGroup"):
                        se_node = find_tag(seg, "selectionEntries")
                        if se_node is not None:
                            for se in iter_tag(se_node, "selectionEntry"):
                                se_pts = extract_pts(se)
                                if se_pts > 0:
                                    pts = se_pts
                                    break
                        if pts > 0:
                            break

    # 6. Contraintes min/max modèles dans l'escouade (scope=parent, field=selections)
    #    Source correcte : contraintes sur le modèle ou le groupe de modèles,
    #    PAS scope=roster qui donne les limites de liste d'armée.
    min_models = None
    max_models = None

    def _extract_squad_constraints(node) -> tuple[int | None, int | None]:
        """Cherche scope=parent, field=selections dans les constraints directes d'un noeud."""
        mn, mx = None, None
        cn = find_tag(node, "constraints")
        if cn is not None:
            for c in iter_tag(cn, "constraint"):
                if attr(c, "field", "") == "selections" and attr(c, "scope", "") == "parent":
                    try:
                        val = int(float(attr(c, "value", "0")))
                    except ValueError:
                        continue
                    ctype = attr(c, "type", "")
                    if ctype == "min" and mn is None:
                        mn = val
                    elif ctype == "max" and mx is None:
                        mx = val
        return mn, mx

    # a) Contraintes directes sur l'unité (ex: modèle unique type=model)
    min_models, max_models = _extract_squad_constraints(entry)

    # b) Si pas trouvé, chercher dans les selectionEntryGroups contenant des models
    if min_models is None and max_models is None:
        seg_node = find_tag(entry, "selectionEntryGroups")
        if seg_node is not None:
            for seg in iter_tag(seg_node, "selectionEntryGroup"):
                # Vérifier si ce SEG contient des selectionEntry de type model
                se_node = find_tag(seg, "selectionEntries")
                if se_node is None:
                    continue
                has_models = any(
                    attr(se, "type", "") == "model"
                    for se in iter_tag(se_node, "selectionEntry")
                )
                if not has_models:
                    continue
                # Contraintes sur le SEG lui-même
                mn, mx = _extract_squad_constraints(seg)
                if mn is not None or mx is not None:
                    min_models, max_models = mn, mx
                    break
                # Contraintes sur les modèles eux-mêmes (ex: Sword Brethren Squad)
                for se in iter_tag(se_node, "selectionEntry"):
                    if attr(se, "type", "") == "model":
                        mn, mx = _extract_squad_constraints(se)
                        if mn is not None or mx is not None:
                            min_models, max_models = mn, mx
                            break
                if min_models is not None or max_models is not None:
                    break

    # c) Chercher dans les selectionEntries directes (type=model sous une unit)
    if min_models is None and max_models is None:
        sub_entries_node = find_tag(entry, "selectionEntries")
        if sub_entries_node is not None:
            model_subs = [
                sub for sub in iter_tag(sub_entries_node, "selectionEntry")
                if attr(sub, "type", "") == "model"
            ]
            if len(model_subs) == 1:
                mn, mx = _extract_squad_constraints(model_subs[0])
                if mn is not None or mx is not None:
                    min_models, max_models = mn, mx
            elif len(model_subs) > 1:
                # Plusieurs types de modèles fixes (ex: Grimaldus×1 + Cenobyte Servitor×3)
                # Si tous ont min==max → additionner pour obtenir la taille totale réelle
                total_min, total_max, all_fixed = 0, 0, True
                for sub in model_subs:
                    mn, mx = _extract_squad_constraints(sub)
                    if mn is not None and mx is not None and mn == mx:
                        total_min += mn
                        total_max += mx
                    elif mn is not None or mx is not None:
                        all_fixed = False
                        break
                if all_fixed and total_max > 0:
                    min_models, max_models = total_min, total_max
                else:
                    for sub in model_subs:
                        mn, mx = _extract_squad_constraints(sub)
                        if mn is not None or mx is not None:
                            min_models, max_models = mn, mx
                            break

    # 6b. Model options : parse chaque selectionEntry type=model avec ses groupes d'armes
    #     Format : [{name, weapon_options}] — vide si l'unité n'a qu'un seul type de modèle
    model_options = []

    def _collect_model_entries(node) -> list[ET.Element]:
        """Retourne les selectionEntry de type model au premier niveau de groupes."""
        models = []
        seg_n = find_tag(node, "selectionEntryGroups")
        if seg_n is not None:
            for seg in iter_tag(seg_n, "selectionEntryGroup"):
                se_n = find_tag(seg, "selectionEntries")
                if se_n is not None:
                    for se in iter_tag(se_n, "selectionEntry"):
                        if attr(se, "type", "") == "model":
                            models.append(se)
        se_n = find_tag(node, "selectionEntries")
        if se_n is not None:
            for se in iter_tag(se_n, "selectionEntry"):
                if attr(se, "type", "") == "model":
                    models.append(se)
        return models

    model_entries = _collect_model_entries(entry)
    for m_entry in model_entries:
        m_name = attr(m_entry, "name", "")
        if is_hidden(m_entry):
            continue
        m_opts = collect_weapon_options(m_entry, index)
        if m_opts:
            mn, mx = _extract_squad_constraints(m_entry)
            m_stats_list: list = []
            collect_from_profiles(m_entry, [], [], m_stats_list, [])
            collect_infolinks(m_entry, index, [], [], m_stats_list)
            model_options.append({
                "name": m_name,
                "weapon_options": m_opts,
                "min_count": mn,
                "max_count": mx,
                "stats": m_stats_list[0] if m_stats_list else None,
            })

    # Stats : profil principal = première occurrence
    stats = stats_list[0] if stats_list else {}

    # Profils secondaires : autres blocs de stats dans les <profiles> directs
    # (ex: Grimaldus + Cenobyte Servitor, Calgar + Victrix Honour Guard)
    secondary_profiles = []
    profiles_node = find_tag(entry, "profiles")
    if profiles_node is not None:
        unit_profiles = [
            (attr(p, "name", ""), extract_unit_stats(p))
            for p in iter_tag(profiles_node, "profile")
            if extract_unit_stats(p) is not None
        ]
        # Le premier est le profil principal (déjà dans stats), les suivants sont secondaires
        for prof_name, prof_stats in unit_profiles[1:]:
            secondary_profiles.append({"name": prof_name, "stats": prof_stats})

    # Associer un count aux profils secondaires dont le modèle a une contrainte fixe > 1
    # (ex: Cenobyte Servitor min=3 max=3 → count=3)
    _sub_node_tmp = find_tag(entry, "selectionEntries")
    if _sub_node_tmp is not None:
        _name_to_count: dict[str, int] = {}
        for _sub in iter_tag(_sub_node_tmp, "selectionEntry"):
            if attr(_sub, "type", "") == "model":
                _mn, _mx = _extract_squad_constraints(_sub)
                if _mn is not None and _mx is not None and _mn == _mx and _mn > 1:
                    _name_to_count[attr(_sub, "name", "")] = _mn
        for _p in secondary_profiles:
            if _p["name"] in _name_to_count:
                _p["count"] = _name_to_count[_p["name"]]

    # Profils secondaires depuis les model entries à n'importe quelle profondeur
    # (ex: Neophyte SV4+ dans Crusader Squad — dans selectionEntryGroups imbriqués)
    # Scan profond : on itère TOUS les selectionEntry type=model de l'unité.
    unit_fp = (stats.get("T"), stats.get("SV"), stats.get("W"))
    seen_fps = {
        (p["stats"].get("T"), p["stats"].get("SV"), p["stats"].get("W"))
        for p in secondary_profiles
    }
    seen_fps.add(unit_fp)
    # Exclure les fingerprints déjà couverts par model_options (ex: Boss Nob)
    for mo in model_options:
        if mo.get("stats"):
            s = mo["stats"]
            seen_fps.add((s.get("T"), s.get("SV"), s.get("W")))
    for m_node in entry.iter():
        if strip_ns(m_node.tag) != "selectionEntry" or attr(m_node, "type") != "model":
            continue
        if is_hidden(m_node):
            continue
        s_list: list = []
        collect_from_profiles(m_node, [], [], s_list, [])
        collect_infolinks(m_node, index, [], [], s_list)
        if not s_list:
            continue
        s = s_list[0]
        fp = (s.get("T"), s.get("SV"), s.get("W"))
        if fp in seen_fps:
            continue
        seen_fps.add(fp)
        # "Neophyte w/ Firearm" → "Neophyte", "Boss Nob" → "Boss Nob"
        simple_name = attr(m_node, "name", "").split("w/")[0].strip()
        secondary_profiles.append({"name": simple_name, "stats": s})

    # Transport capacity
    transport = transport_list[0] if transport_list else None

    return {
        "bsdata_id": bsdata_id,
        "name": name,
        "faction": faction,
        "is_legends": legends,
        "pts": pts,
        "stats": stats,
        "keywords": keywords,
        "abilities": abilities,
        "weapons_default": weapons,
        "weapon_options": weapon_options,
        "transport": transport,
        "model_profiles": secondary_profiles,  # profils de stats secondaires (ex: Cenobyte Servitor)
        "pts_options": pts_options,  # [{n_models, pts, condition}] — vide si pts fixe
        "constraints": {
            "min_models": min_models,
            "max_models": max_models,
        },
        "model_options": model_options,  # [{name, weapon_options}] — vide si modèle unique
        "_entry_type": entry_type,  # temporaire, utilisé pour le post-filtrage dans main()
    }


# ---------------------------------------------------------------------------
# Extraction des règles universelles (.gst sharedRules)
# ---------------------------------------------------------------------------

def extract_rules(root: ET.Element) -> list[dict]:
    rules = []
    shared_rules = find_tag(root, "sharedRules")
    if shared_rules is None:
        return rules
    for rule in iter_tag(shared_rules, "rule"):
        desc_node = find_tag(rule, "description")
        rules.append({
            "bsdata_id": attr(rule, "id", ""),
            "name": attr(rule, "name", ""),
            "description": (desc_node.text or "").strip() if desc_node is not None else "",
        })
    return rules


# ---------------------------------------------------------------------------
# Mapping faction jouable → unit_ids (pour les factions qui utilisent des Libraries)
# ---------------------------------------------------------------------------

def build_faction_unit_map(
    cat_files: list[Path], index: GlobalIndex
) -> tuple[dict[str, list[str]], dict[str, int]]:
    """
    Pour chaque fichier .cat, extrait les entryLinks de premier niveau
    pointant vers des selectionEntry de type model/unit.

    Retourne :
      faction_map  — {faction_name: [bsdata_id, ...]}
      link_pts     — {bsdata_id: pts} pour les entryLinks qui portent les pts
                     (cas Legends et persos dont le coût est sur le lien, pas la définition)
    """
    faction_map: dict[str, list[str]] = {}
    link_pts: dict[str, int] = {}

    def _process_link(link):
        if attr(link, "type", "") != "selectionEntry":
            return None
        target_id = attr(link, "targetId", "")
        target = index.resolve(target_id)
        if target is None or attr(target, "type", "") not in ("model", "unit"):
            return None
        # Récupérer les pts portés par le lien lui-même
        pts = extract_pts(link)
        if pts > 0:
            # Ne remplacer que si aucun pts déjà connu ou si le lien est plus précis
            if target_id not in link_pts or link_pts[target_id] == 0:
                link_pts[target_id] = pts
        return target_id

    for path in cat_files:
        faction = path.stem
        tree = ET.parse(path)
        root = tree.getroot()
        linked_ids: list[str] = []

        # entryLinks racine
        el_node = find_tag(root, "entryLinks")
        if el_node is not None:
            for link in iter_tag(el_node, "entryLink"):
                tid = _process_link(link)
                if tid:
                    linked_ids.append(tid)

        # forceEntries → entryLinks
        fe_node = find_tag(root, "forceEntries")
        if fe_node is not None:
            for fe in iter_tag(fe_node, "forceEntry"):
                sub_el = find_tag(fe, "entryLinks")
                if sub_el is not None:
                    for link in iter_tag(sub_el, "entryLink"):
                        tid = _process_link(link)
                        if tid and tid not in linked_ids:
                            linked_ids.append(tid)

        if linked_ids:
            faction_map[faction] = linked_ids

    return faction_map, link_pts


# ---------------------------------------------------------------------------
# Parsing d'un fichier .cat complet
# ---------------------------------------------------------------------------

def parse_catalogue(path: Path, index: GlobalIndex) -> list[dict]:
    """Parse un fichier .cat et retourne la liste des unités extraites."""
    faction = path.stem
    tree = ET.parse(path)
    root = tree.getroot()
    units = []

    # sharedSelectionEntries — définitions réutilisables des unités
    shared = find_tag(root, "sharedSelectionEntries")
    if shared is not None:
        for entry in iter_tag(shared, "selectionEntry"):
            unit = extract_unit(entry, faction, index)
            if unit:
                units.append(unit)

    # rootSelectionEntries — unités racine (parfois utilisé aussi)
    root_entries = find_tag(root, "rootSelectionEntries") or find_tag(root, "selectionEntries")
    if root_entries is not None:
        for entry in iter_tag(root_entries, "selectionEntry"):
            unit = extract_unit(entry, faction, index)
            if unit:
                existing_ids = {u["bsdata_id"] for u in units}
                if unit["bsdata_id"] not in existing_ids:
                    units.append(unit)

    return units


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=== BSData Parser ===\n")

    # 1. Vérifier que les fichiers existent
    if not RAW_DIR.exists() or not any(RAW_DIR.glob("*.cat")):
        print("Erreur : aucun fichier .cat trouvé dans data/raw/")
        print("Lance d'abord : python pipeline/fetch_bsdata.py")
        return

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # 2. Construire l'index global (.gst en premier)
    print("Chargement de l'index global...")
    index = GlobalIndex()

    gst_files = list(RAW_DIR.glob("*.gst"))
    for gst in gst_files:
        print(f"  [gst] {gst.name}")
        index.load_file(gst, "__gst__")

    cat_files = sorted(RAW_DIR.glob("*.cat"))
    for cat in cat_files:
        print(f"  [cat] {cat.name}")
        index.load_file(cat, cat.stem)

    print(f"\n  → {len(index._index)} noeuds indexés\n")

    # 3. Extraire les règles universelles
    print("Extraction des règles universelles...")
    all_rules = []
    for gst in gst_files:
        tree = ET.parse(gst)
        all_rules.extend(extract_rules(tree.getroot()))
    print(f"  → {len(all_rules)} règles\n")

    # 4. Extraire les unités de chaque faction
    print("Extraction des unités...")
    all_units = []
    factions = set()
    seen_ids = set()

    for cat in cat_files:
        faction = cat.stem
        units = parse_catalogue(cat, index)
        new_units = []
        for u in units:
            if u["bsdata_id"] not in seen_ids:
                # Ignorer les composants de squad : pas de stats et 0 pts
                if not u["stats"] and u["pts"] == 0:
                    continue
                seen_ids.add(u["bsdata_id"])
                new_units.append(u)
        all_units.extend(new_units)
        if new_units:
            factions.add(faction)
        print(f"  {faction:<45} → {len(new_units):>3} unités")

    # 4b. Construire le mapping faction jouable → unit_ids + pts des entryLinks
    print("\nConstruction du mapping factions jouables → unités...")
    faction_unit_map, link_pts = build_faction_unit_map(cat_files, index)

    # Patcher les pts=0 pour les unités dont le coût est sur l'entryLink
    # (ex: Kravek Morne 120pts, Land Speeder Storm 70pts, Celestian Sacresant Aveline 45pts)
    patched = 0
    for u in all_units:
        if u["pts"] == 0 and u["bsdata_id"] in link_pts:
            u["pts"] = link_pts[u["bsdata_id"]]
            patched += 1
    if patched:
        print(f"  → {patched} unités patchées avec les pts de leur entryLink")

    # Post-filtrage : supprimer les sous-composants type="model" pts=0 non référencés
    # dans faction_unit_map. Ex: Geminae Superia (incluse avec Saint Celestine),
    # Celestian Sacresant (Anointed Halberd) (variante d'arme), etc.
    # Les vrais type="model" standalone (Land Speeder Storm, Imperial Fortress Walls…)
    # apparaissent dans faction_unit_map même si leurs pts sont sur l'entryLink.
    faction_unit_ids = {uid for ids in faction_unit_map.values() for uid in ids}
    before_filter = len(all_units)
    all_units = [
        u for u in all_units
        if not (u["pts"] == 0 and u["_entry_type"] == "model" and u["bsdata_id"] not in faction_unit_ids)
    ]
    filtered_count = before_filter - len(all_units)
    if filtered_count:
        print(f"  → {filtered_count} sous-composants type=model filtrés (pts=0, hors faction_units)")

    # Supprimer le champ temporaire avant l'écriture JSON
    for u in all_units:
        u.pop("_entry_type", None)

    # Ajouter playable_in à chaque unité
    unit_by_id = {u["bsdata_id"]: u for u in all_units}
    for faction_name, unit_ids in faction_unit_map.items():
        factions.add(faction_name)
        for uid in unit_ids:
            if uid in unit_by_id:
                unit_by_id[uid].setdefault("playable_in", [])
                if faction_name not in unit_by_id[uid]["playable_in"]:
                    unit_by_id[uid]["playable_in"].append(faction_name)

    # Pour les unités sans playable_in, leur faction source = leur faction de définition
    for u in all_units:
        if "playable_in" not in u:
            u["playable_in"] = [u["faction"]]

    linked_factions = sorted(faction_unit_map.keys())
    print(f"  → {len(linked_factions)} factions jouables via Library mappées")

    print(f"\n  → {len(all_units)} unités au total\n")

    # 5. Dédupliquer les armes (collectées depuis toutes les unités)
    print("Déduplification des armes...")
    all_weapons: dict[str, dict] = {}

    def collect_weapons_from_unit(unit: dict):
        for w in unit.get("weapons_default", []):
            wid = w.get("bsdata_id") or w.get("name", "")
            if wid and wid not in all_weapons:
                all_weapons[wid] = w
        for group in unit.get("weapon_options", []):
            collect_weapons_from_group(group)

    def collect_weapons_from_group(group: dict):
        for w in group.get("weapons", []):
            wid = w.get("bsdata_id") or w.get("name", "")
            if wid and wid not in all_weapons:
                all_weapons[wid] = w
        for sub in group.get("sub_groups", []):
            collect_weapons_from_group(sub)

    for unit in all_units:
        collect_weapons_from_unit(unit)

    print(f"  → {len(all_weapons)} armes uniques\n")

    # 6. Factions triées (toutes les factions connues)
    factions_list = sorted(factions)

    # 7. Écriture des JSON
    print("Écriture des fichiers cache...")

    (CACHE_DIR / "rules.json").write_text(
        json.dumps(all_rules, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  data/cache/rules.json       ({len(all_rules)} règles)")

    (CACHE_DIR / "factions.json").write_text(
        json.dumps(factions_list, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  data/cache/factions.json    ({len(factions_list)} factions)")

    (CACHE_DIR / "units.json").write_text(
        json.dumps(all_units, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  data/cache/units.json       ({len(all_units)} unités)")

    (CACHE_DIR / "weapons.json").write_text(
        json.dumps(list(all_weapons.values()), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  data/cache/weapons.json     ({len(all_weapons)} armes)")

    (CACHE_DIR / "faction_units.json").write_text(
        json.dumps(faction_unit_map, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"  data/cache/faction_units.json ({len(faction_unit_map)} factions mappées)")

    print("\nTerminé.")


if __name__ == "__main__":
    main()
