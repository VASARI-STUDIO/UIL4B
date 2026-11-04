"""Build src/data/nearest/munsell.json and iscc-nbs.json.

Run through build-nearest-data.mjs, or directly:

    uv run --with colour-science==0.4.7 python -I scripts/munsell_to_lab.py --out-dir src/data/nearest

Munsell: the 1943 renotation "real" samples bundled with colour-science (CIE xyY
under illuminant C, Y multiplied by 0.975). Each is converted to XYZ, adapted from
illuminant C to D50 with Bradford, and stored as Lab (D50). Samples outside sRGB
are dropped, so a swatch shows the real colour.

ISCC-NBS: the 267 block centroids in scripts/nearest-sources/iscc-nbs-centroids.tsv,
each converted from its Munsell notation with colour-science's interpolation, then
the same way. A centroid outside sRGB has its chroma reduced at constant lightness
and hue until it fits.

Deterministic: same pinned library, same input, same bytes out.
"""
import argparse
import json
import os
import re
import sys
import warnings

warnings.filterwarnings("ignore")

import numpy as np  # noqa: E402
import colour  # noqa: E402
from colour.adaptation import matrix_chromatic_adaptation_VonKries  # noqa: E402
from colour.notation import munsell_colour_to_xyY  # noqa: E402
from colour.notation.datasets.munsell import MUNSELL_COLOURS_REAL  # noqa: E402

PINNED = "0.4.7"
HERE = os.path.dirname(os.path.abspath(__file__))

# Same constants as src/utils/nearestMatch.js.
M_SRGB = np.array([
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.0721750],
    [0.0193339, 0.1191920, 0.9503041],
])
WHITE_D50 = np.array([0.9642, 1.0, 0.8249])
WHITE_D65 = M_SRGB @ np.ones(3)
WHITE_C = colour.xy_to_XYZ(np.array([0.31006, 0.31616]))  # CIE illuminant C, 2 degree observer

C_TO_D50 = matrix_chromatic_adaptation_VonKries(WHITE_C, WHITE_D50, transform="Bradford")
D50_TO_D65 = matrix_chromatic_adaptation_VonKries(WHITE_D50, WHITE_D65, transform="Bradford")
XYZ50_TO_LINRGB = np.linalg.inv(M_SRGB) @ D50_TO_D65

EPS = 216 / 24389
KAPPA = 24389 / 27


def f(t):
    return np.where(t > EPS, np.cbrt(t), (KAPPA * t + 16) / 116)


def finv(t):
    return np.where(t**3 > EPS, t**3, (116 * t - 16) / KAPPA)


def xyz50_to_lab(xyz):
    fx, fy, fz = f(xyz / WHITE_D50)
    return np.array([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)])


def lab_to_xyz50(lab):
    fy = (lab[0] + 16) / 116
    return WHITE_D50 * finv(np.array([fy + lab[1] / 500, fy, fy - lab[2] / 200]))


def linrgb_of_lab(lab):
    return XYZ50_TO_LINRGB @ lab_to_xyz50(lab)


def in_gamut(lab, eps=1e-3):
    rgb = linrgb_of_lab(lab)
    return bool(np.all(rgb >= -eps) and np.all(rgb <= 1 + eps))


def reduce_chroma(lab):
    """Scale a and b down at constant L until the colour fits sRGB (bisection)."""
    if in_gamut(lab):
        return lab, False
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if in_gamut(np.array([lab[0], lab[1] * mid, lab[2] * mid])):
            lo = mid
        else:
            hi = mid
    return np.array([lab[0], lab[1] * lo, lab[2] * lo]), True


def xyy_c_to_lab(x, y, big_y):
    """xyY under illuminant C (Y 0-1) to Lab under D50."""
    big_x = x * big_y / y
    big_z = (1 - x - y) * big_y / y
    return xyz50_to_lab(C_TO_D50 @ np.array([big_x, big_y, big_z]))


def num(v):
    r = round(float(v), 2)
    return 0.0 if r == 0 else r


def fmt_notation_number(v):
    return ("%g" % v)


def write_system(path, header, rows):
    head = json.dumps(header, ensure_ascii=False, separators=(",", ":"))
    assert head.endswith("}")
    lines = [json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows]
    body = head[:-1] + ',"rows":[\n' + ",\n".join(lines) + "\n]}\n"
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(body)


def header_for(meta, count, extra=None):
    h = {
        "id": meta["id"],
        "label": meta["label"],
        "group": meta["group"],
        "version": meta["version"],
        "source": meta["source"],
        "sourceUrl": meta["sourceUrl"],
        "licence": meta["licence"],
        "licenceUrl": meta["licenceUrl"],
        "note": meta["note"],
        "count": count,
    }
    if extra:
        h.update(extra)
    return h


def build_munsell(meta):
    rows = []
    dropped = 0
    for (hue, value, chroma), xyy in MUNSELL_COLOURS_REAL:
        x, y, big_y = float(xyy[0]), float(xyy[1]), float(xyy[2])
        lab = xyy_c_to_lab(x, y, big_y * 0.975 / 100)
        if not in_gamut(lab):
            dropped += 1
            continue
        name = "%s %s/%s" % (hue, fmt_notation_number(value), fmt_notation_number(chroma))
        rows.append([name, None, None, num(lab[0]), num(lab[1]), num(lab[2])])
    # Neutral axis N1 to N9 from the ASTM D1535 value function.
    from colour.notation.munsell import luminance_ASTMD1535
    for v in range(1, 10):
        y = float(luminance_ASTMD1535(float(v))) / 100
        lab = xyy_c_to_lab(0.31006, 0.31616, y)
        rows.append(["N %d/" % v, None, None, num(lab[0]), 0.0, 0.0])
    # The Lab of an achromatic Y under D50 has a and b of about 0 by construction; pin them.
    return rows, dropped


def parse_notation(n):
    n = n.strip()
    if n.startswith("N "):
        return "N" + n[2:].strip()
    return n


def notation_to_xyy(notation):
    """Munsell notation to xyY (illuminant C). The renotation interpolation only
    covers values 1 to 9; a centroid outside that (a few near-blacks and whites,
    all of low chroma) takes its chromaticity from the nearest edge value and its
    luminance from the ASTM D1535 value function at the real value."""
    m = re.fullmatch(r"(\S+) (\d+(?:\.\d+)?)/(\d+(?:\.\d+)?)", notation)
    if not m or 1 <= float(m.group(2)) <= 9:
        return munsell_colour_to_xyY(notation)
    from colour.notation.munsell import luminance_ASTMD1535
    value = float(m.group(2))
    edge = 1 if value < 1 else 9
    x, y, _ = munsell_colour_to_xyY("%s %d/%s" % (m.group(1), edge, m.group(3)))
    return x, y, float(luminance_ASTMD1535(value)) / 100


def build_iscc(meta, tsv):
    rows = []
    mapped = []
    with open(tsv, encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\r\n")
            if not line or line.startswith("#"):
                continue
            number, name, notation = line.split("\t")
            x, y, big_y = notation_to_xyy(parse_notation(notation))
            lab = xyy_c_to_lab(float(x), float(y), float(big_y))
            lab, was_mapped = reduce_chroma(lab)
            if was_mapped:
                mapped.append(int(number))
            name = name[:1].upper() + name[1:]  # "moderate blue" -> "Moderate blue"
            rows.append([name, "No. %s" % number, None, num(lab[0]), num(lab[1]), num(lab[2])])
    return rows, mapped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--only", choices=["munsell", "iscc-nbs"])
    args = ap.parse_args()
    if colour.__version__ != PINNED:
        sys.exit("colour-science %s found, %s pinned" % (colour.__version__, PINNED))

    with open(os.path.join(HERE, "nearest-sources", "systems.json"), encoding="utf-8") as fh:
        systems = {s["id"]: s for s in json.load(fh)["systems"]}
    os.makedirs(args.out_dir, exist_ok=True)

    if args.only in (None, "munsell"):
        rows, dropped = build_munsell(systems["munsell"])
        write_system(os.path.join(args.out_dir, "munsell.json"),
                     header_for(systems["munsell"], len(rows), {"droppedOutsideSrgb": dropped}), rows)
        print("munsell: %d rows kept, %d outside sRGB dropped" % (len(rows), dropped))
    if args.only in (None, "iscc-nbs"):
        rows, mapped = build_iscc(systems["iscc-nbs"], os.path.join(HERE, "nearest-sources", "iscc-nbs-centroids.tsv"))
        write_system(os.path.join(args.out_dir, "iscc-nbs.json"),
                     header_for(systems["iscc-nbs"], len(rows), {"chromaReduced": len(mapped)}), rows)
        print("iscc-nbs: %d rows, %d chroma-reduced into sRGB" % (len(rows), len(mapped)))
        print("iscc-nbs reduced numbers: " + ",".join(str(n) for n in mapped))


if __name__ == "__main__":
    main()
