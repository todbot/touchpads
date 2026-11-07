# SPDX-FileCopyrightText: Copyright (c) 2026 Tod Kurt
# SPDX-License-Identifier: MIT
"""
`captouch_pos`
================================================================================

Compute finger position on a slider, arc or wheel made with
captouch-designer (https://todbot.github.io/touchpads/captouch-designer/),
using the SLIDER dict from its "CircuitPython" export.

"""

import math

def slider_pos(cfg, vals, min_total=0.05):
    """
    Given per-channel touch amounts in CH0, CH1, ... order
    (0 = untouched, bigger = more touched), return position 0-1
    or None if not touched
    """
    vals = [max(0, v) for v in vals]
    total = sum(vals)
    if total < min_total:
        return None

    mode = cfg["mode"]
    if mode == "centroid":
        return sum(v * c for v, c in zip(vals, cfg["center"])) / total

    # vector sum: each channel pulls toward its angle
    x = y = 0
    for v, a in zip(vals, cfg["angle"]):
        a = math.radians(a)
        x += v * math.sin(a)
        y += v * math.cos(a)
    turn = (math.atan2(x, y) / (2 * math.pi)) % 1
    if mode == "wheel":
        return turn

    # split ends: both ends are the same channel, so near the wrap point
    # use the channels next to each end to tell which end it is
    n = len(vals)
    s_start, s_end = vals[cfg["ends"][0]], vals[cfg["ends"][1]]
    if turn > (n - 1) / n and s_start > s_end:
        turn -= 1
    elif turn < 1 / n and s_end > s_start:
        turn += 1
    return min(max(cfg["offset"] + turn * cfg["scale"], 0), 1)
