#!/usr/bin/env python3
"""Build static Web Mercator basemaps from the OpenStreetMap extract in scripts/data.

tile.openstreetmap.org forbids bulk and offline tile use, so the maps are drawn
from roads, lakes, and town points cached in this repo. Labels are not baked
into the SVG; the page places towns, roads, and pins together.

    python3 scripts/build-basemap.py

Rebuild the cache from a fresh Overpass dump (not required to regenerate maps):

    python3 scripts/build-basemap.py --rebuild-cache /path/to/roads.json /path/to/local.json /path/to/water.json /path/to/places.json
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "scripts" / "data"
OUT_DIR = ROOT / "static" / "maps"
FRAME_PATH = ROOT / "src" / "lib" / "data" / "map-frames.json"
SEED_PATH = ROOT / "src" / "lib" / "data" / "label-seeds.json"

WIDTH = 480
# ChampionsGate is omitted on purpose: the golf pin already labels it.
TOWNS = {
    "Orlando": 18,
    "Kissimmee": 16,
    "Clermont": 15,
    "Winter Haven": 15,
    "Davenport": 14,
    "Haines City": 14,
    "Celebration": 14,
    "Four Corners": 14,
}
ROAD_LABELS = {
    "I 4": "I-4",
    "US 192": "US-192",
    "US 27": "US-27",
    "SR 417 Toll": "SR-417",
    "SR 429 Toll": "SR-429",
    "World Drive": "World Dr",
    "North World Drive": "World Dr",
}
# These corridors have to cross the regional frame, not stop in the middle.
THROUGH = ("I-4", "SR-429", "US-27")


def merc_y(lat: float) -> float:
    s = math.sin(math.radians(lat))
    return 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)


def rdp(points: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    dx, dy = end[0] - start[0], end[1] - start[1]
    denom = math.hypot(dx, dy) or 1.0
    worst_i, worst = 0, -1.0
    for i, p in enumerate(points[1:-1], 1):
        dist = abs(dy * p[0] - dx * p[1] + end[0] * start[1] - end[1] * start[0]) / denom
        if dist > worst:
            worst, worst_i = dist, i
    if worst <= eps:
        return [start, end]
    return rdp(points[: worst_i + 1], eps)[:-1] + rdp(points[worst_i:], eps)


def chain(segments: list[list[tuple[float, float]]]) -> list[list[tuple[float, float]]]:
    def key(p: tuple[float, float]) -> tuple[float, float]:
        return (round(p[0], 4), round(p[1], 4))

    unused = {i: seg for i, seg in enumerate(segments) if len(seg) >= 2}
    chains: list[list[tuple[float, float]]] = []
    while unused:
        i = next(iter(unused))
        seg = unused.pop(i)
        changed = True
        while changed:
            changed = False
            end_k, start_k = key(seg[-1]), key(seg[0])
            for j, other in list(unused.items()):
                if key(other[0]) == end_k:
                    seg = seg + other[1:]
                elif key(other[-1]) == end_k:
                    seg = seg + list(reversed(other))[1:]
                elif key(other[-1]) == start_k:
                    seg = other[:-1] + seg
                elif key(other[0]) == start_k:
                    seg = list(reversed(other))[:-1] + seg
                else:
                    continue
                unused.pop(j)
                changed = True
                break
        chains.append(seg)
    return chains


def dedupe(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    out = []
    for p in points:
        q = (round(p[0], 5), round(p[1], 5))
        if not out or out[-1] != q:
            out.append(q)
    return out


def frame_for(west: float, east: float, south: float, north: float) -> dict:
    span_x = (east - west) / 360
    span_y = merc_y(south) - merc_y(north)
    height = int(round(WIDTH * span_y / span_x))
    return {"width": WIDTH, "height": height, "west": west, "east": east, "south": south, "north": north}


def project(lng: float, lat: float, frame: dict) -> tuple[float, float]:
    x = (lng - frame["west"]) / (frame["east"] - frame["west"]) * frame["width"]
    y = (merc_y(lat) - merc_y(frame["north"])) / (merc_y(frame["south"]) - merc_y(frame["north"])) * frame["height"]
    return x, y


def clip_polyline(points: list[tuple[float, float]], bounds: tuple[float, float, float, float]) -> list[list[tuple[float, float]]]:
    """Clip a polyline to an expanded rectangle. Pieces that leave the frame end on the boundary."""
    xmin, ymin, xmax, ymax = bounds

    def inside(p: tuple[float, float]) -> bool:
        return xmin <= p[0] <= xmax and ymin <= p[1] <= ymax

    def cross(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
        ax, ay = a
        bx, by = b
        dx, dy = bx - ax, by - ay
        cands = []
        if dx:
            for edge in (xmin, xmax):
                t = (edge - ax) / dx
                if 0 <= t <= 1:
                    y = ay + t * dy
                    if ymin - 1e-6 <= y <= ymax + 1e-6:
                        cands.append((t, (edge, min(max(y, ymin), ymax))))
        if dy:
            for edge in (ymin, ymax):
                t = (edge - ay) / dy
                if 0 <= t <= 1:
                    x = ax + t * dx
                    if xmin - 1e-6 <= x <= xmax + 1e-6:
                        cands.append((t, (min(max(x, xmin), xmax), edge)))
        if not cands:
            return b
        cands.sort(key=lambda item: item[0])
        return cands[0][1]

    pieces: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []
    for i, p in enumerate(points):
        if i == 0:
            if inside(p):
                current = [p]
            continue
        prev = points[i - 1]
        pin, qin = inside(prev), inside(p)
        if pin and qin:
            current.append(p)
        elif pin and not qin:
            current.append(cross(prev, p))
            if len(current) >= 2:
                pieces.append(current)
            current = []
        elif qin and not pin:
            current = [cross(p, prev), p]
        else:
            # Both outside: keep the segment only when it cuts through the rectangle.
            enter = cross(prev, p)
            leave = cross(p, prev)
            if enter != p and leave != prev and (abs(enter[0] - leave[0]) > 0.5 or abs(enter[1] - leave[1]) > 0.5):
                if inside(enter) or inside(leave) or (
                    xmin <= enter[0] <= xmax and ymin <= enter[1] <= ymax
                ):
                    pieces.append([enter, leave])
    if len(current) >= 2:
        pieces.append(current)
    return pieces


def path_d(points: list[tuple[float, float]]) -> str | None:
    if len(points) < 2:
        return None
    length = 0.0
    for a, b in zip(points, points[1:]):
        length += math.hypot(b[0] - a[0], b[1] - a[1])
    if length < 1:
        return None
    cmds = [f"M{points[0][0]:.1f} {points[0][1]:.1f}"]
    cmds += [f"L{x:.1f} {y:.1f}" for x, y in points[1:]]
    return " ".join(cmds)


def sample_points(pieces: list[list[tuple[float, float]]], frame: dict, step: float) -> list[list[float]]:
    margin = 28

    def accept(x: float, y: float) -> None:
        if margin < x < frame["width"] - margin and margin < y < frame["height"] - margin:
            found.append((round(x, 1), round(y, 1)))

    found: list[tuple[float, float]] = []
    for piece in pieces:
        # Midpoint of each drawn piece, so a short corridor still gets a seed.
        walked = 0.0
        half = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(piece, piece[1:])) / 2
        for a, b in zip(piece, piece[1:]):
            seg = math.hypot(b[0] - a[0], b[1] - a[1])
            if walked <= half <= walked + seg and seg:
                t = (half - walked) / seg
                accept(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                break
            walked += seg
        walked = 0.0
        next_at = step
        for a, b in zip(piece, piece[1:]):
            seg = math.hypot(b[0] - a[0], b[1] - a[1])
            while walked + seg >= next_at:
                t = (next_at - walked) / seg if seg else 0
                accept(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                next_at += step
            walked += seg
    # Unique, stable order along the road.
    seen = set()
    out = []
    for x, y in found:
        key = (x, y)
        if key in seen:
            continue
        seen.add(key)
        out.append([x, y])
    return out


def load_cache() -> tuple[list[dict], list[list[tuple[float, float]]], list[dict]]:
    roads = json.loads((DATA / "roads.json").read_text())
    water = json.loads((DATA / "water.json").read_text())
    towns = json.loads((DATA / "towns.json").read_text())
    road_objs = []
    for road in roads:
        pts = [(p[0], p[1]) for p in road["pts"]]
        if len(pts) >= 2:
            road_objs.append({"kind": road["kind"], "ref": road.get("ref") or "", "name": road.get("name") or "", "pts": pts})
    rings = [[(p[0], p[1]) for p in ring] for ring in water if len(ring) >= 4]
    return road_objs, rings, towns


def draw(frame: dict, roads: list[dict], water: list, towns: list[dict], eps: float, local: bool) -> tuple[str, dict, dict[str, list[tuple[float, float]]]]:
    pad = 36
    bounds = (-pad, -pad, frame["width"] + pad, frame["height"] + pad)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {frame["width"]} {frame["height"]}" width="{frame["width"]}" height="{frame["height"]}">',
        '<rect width="100%" height="100%" fill="#f4f0e6"/>',
    ]
    for ring in water:
        projected = [project(lng, lat, frame) for lng, lat in ring]
        simple = rdp(projected, eps * 1.4)
        for piece in clip_polyline(simple, bounds):
            d = path_d(piece)
            if not d:
                continue
            parts.append(f'<path d="{d} Z" fill="#9ec9e8" stroke="#7eb4d6" stroke-width="0.6"/>')

    style = {
        "local": ("#d5d0c6", "#ffffff", 1.3, 3.2),
        "trunk": ("#c4a15a", "#f3d48a", 2.4, 4.6),
        "motorway": ("#d06a32", "#f4a15a", 3.2, 6.2),
    }
    buckets: dict[tuple[str, str, str], list] = {}
    for road in roads:
        kind = road["kind"]
        if kind == "local" and not local:
            continue
        if kind == "motorway" and road["name"] in {"World Drive", "North World Drive"}:
            kind = "trunk"
        if kind not in style:
            continue
        ref = road["ref"] or road["name"]
        buckets.setdefault((kind, ref, road["name"]), []).append(road["pts"])

    grouped: dict[str, list[tuple]] = {k: [] for k in ("local", "trunk", "motorway")}
    label_pieces: dict[str, list[list[tuple[float, float]]]] = {}
    unclipped_ends: dict[str, list[tuple[tuple[float, float], tuple[float, float]]]] = {}
    for (kind, ref, name), segs in buckets.items():
        casing, fill, sw, casing_w = style[kind]
        display = ROAD_LABELS.get(ref) or ROAD_LABELS.get(name)
        for piece in chain(segs):
            projected = [project(lng, lat, frame) for lng, lat in piece]
            simple = rdp(projected, eps)
            if len(simple) < 2:
                continue
            if all(x < -pad or x > frame["width"] + pad or y < -pad or y > frame["height"] + pad for x, y in simple):
                continue
            if display:
                unclipped_ends.setdefault(display, []).append((simple[0], simple[-1]))
            drawn = False
            for clipped in clip_polyline(simple, bounds):
                d = path_d(clipped)
                if not d:
                    continue
                grouped[kind].append((casing, fill, sw, casing_w, d, display))
                if display:
                    label_pieces.setdefault(display, []).append(clipped)
                drawn = True
            if not drawn and display:
                pass

    order = ["local", "trunk", "motorway"] if local else ["trunk", "motorway"]
    for kind in order:
        for casing, _fill, _sw, casing_w, d, _display in grouped[kind]:
            parts.append(
                f'<path d="{d}" fill="none" stroke="{casing}" stroke-width="{casing_w}" stroke-linecap="round" stroke-linejoin="round"/>'
            )
        fills: dict[str, list[str]] = {}
        plain_fills = []
        for _casing, fill, sw, _casing_w, d, display in grouped[kind]:
            tag = f'<path d="{d}" fill="none" stroke="{fill}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
            if display:
                fills.setdefault(display, []).append(tag)
            else:
                plain_fills.append(tag)
        parts.extend(plain_fills)
        for display, tags in fills.items():
            parts.append(f'<g data-road="{display}">{"".join(tags)}</g>')

    parts.append("</svg>")
    seeds = {
        "towns": [],
        "roads": [],
    }
    for town in towns:
        if town["name"] not in TOWNS:
            continue
        x, y = project(town["lng"], town["lat"], frame)
        if not (12 < x < frame["width"] - 12 and 16 < y < frame["height"] - 12):
            continue
        seeds["towns"].append({"text": town["name"], "size": TOWNS[town["name"]], "x": round(x, 1), "y": round(y, 1)})
    for display, pieces in label_pieces.items():
        points = sample_points(pieces, frame, 52)
        if points:
            seeds["roads"].append({"text": display, "size": 13, "points": points})
    return "\n".join(parts), seeds, unclipped_ends


def assert_through(frame: dict, ends: dict[str, list[tuple[tuple[float, float], tuple[float, float]]]]) -> None:
    """Corridors have to leave the frame on the sides the old extract cut off.

    SR-429's southern terminus is the I-4 interchange, inside the frame. That end
    is real. The cut that mattered was the northern one, short of Orlando.
    """

    def pts(name: str) -> list[tuple[float, float]]:
        pairs = ends.get(name) or []
        found = [pt for pair in pairs for pt in pair]
        if not found:
            raise SystemExit(f"regional map is missing {name} geometry")
        return found

    i4 = pts("I-4")
    if not any(p[1] < 0 for p in i4):
        raise SystemExit("I-4 does not reach the north edge of the regional frame")
    if not any(p[0] < 0 or p[1] > frame["height"] for p in i4):
        raise SystemExit("I-4 does not reach the southwest edge of the regional frame")
    beltway = pts("SR-429")
    if not any(p[1] < 0 for p in beltway):
        raise SystemExit("SR-429 does not reach the north edge of the regional frame")
    us27 = pts("US-27")
    if not any(p[1] < 0 for p in us27) or not any(p[1] > frame["height"] for p in us27):
        raise SystemExit("US-27 does not cross the regional frame")


def classify(tags: dict) -> tuple[str, str, str] | None:
    highway = tags.get("highway") or ""
    ref = (tags.get("ref") or "").split(";")[0].strip()
    name = tags.get("name") or ""
    if highway == "motorway":
        return "motorway", ref, name
    if ref in {"US 192", "US 27"} or name in {"World Drive", "North World Drive"}:
        return "trunk", ref, name
    if highway in {"primary", "secondary", "trunk"}:
        return "local", ref, name
    return None


def bbox_hits(pts: list[tuple[float, float]], west: float, east: float, south: float, north: float) -> bool:
    min_lng = min(p[0] for p in pts)
    max_lng = max(p[0] for p in pts)
    min_lat = min(p[1] for p in pts)
    max_lat = max(p[1] for p in pts)
    return max_lng >= west and min_lng <= east and max_lat >= south and min_lat <= north


def rebuild_cache(roads_path: Path, local_path: Path, water_path: Path, places_path: Path) -> None:
    regional_bounds = (-81.92, -81.12, 27.82, 28.74)
    local_bounds = (-81.82, -81.40, 28.14, 28.50)
    seen = set()
    collected: list[dict] = []
    for path in (roads_path, local_path):
        elements = json.loads(path.read_text())["elements"]
        for el in elements:
            if el.get("type") != "way" or el["id"] in seen:
                continue
            tags = el.get("tags") or {}
            kind = classify(tags)
            if not kind:
                continue
            pts = dedupe([(p["lon"], p["lat"]) for p in el.get("geometry") or []])
            if len(pts) < 2:
                continue
            road_kind, ref, name = kind
            bounds = regional_bounds if road_kind in {"motorway", "trunk"} else local_bounds
            if not bbox_hits(pts, *bounds):
                continue
            seen.add(el["id"])
            collected.append({"kind": road_kind, "ref": ref, "name": name, "pts": pts})

    chained_out = []
    buckets: dict[tuple[str, str, str], list] = {}
    for road in collected:
        buckets.setdefault((road["kind"], road["ref"], road["name"]), []).append(road["pts"])
    for (kind, ref, name), segs in buckets.items():
        eps = 0.00045 if kind == "local" else 0.00028
        for piece in chain(segs):
            simple = dedupe(rdp(piece, eps))
            if len(simple) < 2:
                continue
            chained_out.append({"kind": kind, "ref": ref, "name": name, "pts": [[p[0], p[1]] for p in simple]})

    elements = json.loads(water_path.read_text())["elements"]
    rings = []
    for el in elements:
        candidates = []
        if el["type"] == "way":
            candidates.append([(p["lon"], p["lat"]) for p in el.get("geometry") or []])
        else:
            for member in el.get("members") or []:
                if member.get("role") not in ("outer", ""):
                    continue
                candidates.append([(p["lon"], p["lat"]) for p in member.get("geometry") or []])
        for pts in candidates:
            if len(pts) < 80:
                continue
            simple = dedupe(rdp(pts, 0.0006))
            if len(simple) < 4:
                continue
            span = math.hypot(max(p[0] for p in simple) - min(p[0] for p in simple), max(p[1] for p in simple) - min(p[1] for p in simple))
            if span < 0.01:
                continue
            if not bbox_hits(simple, -81.95, -81.10, 27.80, 28.76):
                continue
            rings.append([[p[0], p[1]] for p in simple])

    places = json.loads(places_path.read_text())["elements"]
    towns = []
    seen_names = set()
    for el in places:
        name = (el.get("tags") or {}).get("name")
        if name not in TOWNS or name in seen_names:
            continue
        seen_names.add(name)
        towns.append({"name": name, "lat": round(el["lat"], 5), "lng": round(el["lon"], 5)})
    missing = set(TOWNS) - seen_names
    if missing:
        raise SystemExit(f"missing towns: {sorted(missing)}")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "roads.json").write_text(json.dumps(chained_out, separators=(",", ":")))
    (DATA / "water.json").write_text(json.dumps(rings, separators=(",", ":")))
    (DATA / "towns.json").write_text(json.dumps(towns, indent=2) + "\n")
    print(
        "cache",
        "roads",
        (DATA / "roads.json").stat().st_size,
        "water",
        (DATA / "water.json").stat().st_size,
        "towns",
        len(towns),
        "chains",
        len(chained_out),
    )


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--rebuild-cache":
        paths = [Path(p) for p in sys.argv[2:]]
        if len(paths) != 4:
            raise SystemExit("usage: --rebuild-cache roads.json local-roads.json water.json places.json")
        rebuild_cache(*paths)
        return

    roads, water, towns = load_cache()
    regional = frame_for(-81.80, -81.25, 27.95, 28.60)
    local = frame_for(-81.74, -81.48, 28.22, 28.40)
    regional_svg, regional_seeds, regional_ends = draw(regional, roads, water, towns, 1.35, False)
    local_svg, local_seeds, _local_ends = draw(local, roads, water, towns, 0.85, True)
    assert_through(regional, regional_ends)
    for name in ("I-4", "US-192", "US-27", "SR-417", "SR-429", "World Dr"):
        if f'data-road="{name}"' not in regional_svg:
            raise SystemExit(f"regional map is missing {name}")
    for name in ("I-4", "US-192", "SR-429", "World Dr"):
        if f'data-road="{name}"' not in local_svg:
            raise SystemExit(f"local map is missing {name}")
    if "<text" in regional_svg or "<text" in local_svg:
        raise SystemExit("basemap SVG must not contain text; labels are placed on the page")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "regional.svg").write_text(regional_svg)
    (OUT_DIR / "local.svg").write_text(local_svg)
    FRAME_PATH.write_text(json.dumps({"regional": regional, "local": local}, indent=2) + "\n")
    SEED_PATH.write_text(json.dumps({"regional": regional_seeds, "local": local_seeds}, indent=2) + "\n")
    for name, svg in ("regional", regional_svg), ("local", local_svg):
        print(name, len(svg.encode()), "bytes")


if __name__ == "__main__":
    main()
