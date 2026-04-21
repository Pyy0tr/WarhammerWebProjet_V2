"""
engine/dice.py
--------------
Dice rolling utilities. Pure Python, no external dependencies.
Supports expressions: "4", "D6", "D6+2", "2D3", "2D6+1"
"""

import random
import re


def roll(expr: str | int) -> int:
    """Roll a dice expression, return integer result (minimum 1)."""
    if isinstance(expr, (int, float)):
        return max(1, int(expr))

    s = str(expr).upper().strip()

    if s.isdigit():
        return max(1, int(s))

    # D6
    m = re.fullmatch(r"D(\d+)", s)
    if m:
        return random.randint(1, int(m.group(1)))

    # D6+2
    m = re.fullmatch(r"D(\d+)\+(\d+)", s)
    if m:
        return random.randint(1, int(m.group(1))) + int(m.group(2))

    # 2D6
    m = re.fullmatch(r"(\d+)D(\d+)", s)
    if m:
        n, f = int(m.group(1)), int(m.group(2))
        return sum(random.randint(1, f) for _ in range(n))

    # 2D6+1
    m = re.fullmatch(r"(\d+)D(\d+)\+(\d+)", s)
    if m:
        n, f, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return sum(random.randint(1, f) for _ in range(n)) + b

    return 1  # fallback


def clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))


def wound_threshold(strength: int, toughness: int) -> int:
    """Return the minimum die result needed to wound (WH40K 10e rules)."""
    if strength >= 2 * toughness:
        return 2
    elif strength > toughness:
        return 3
    elif strength == toughness:
        return 4
    elif toughness >= 2 * strength:
        return 6
    else:
        return 5
