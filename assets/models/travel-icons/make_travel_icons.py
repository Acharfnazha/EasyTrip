"""Low-poly EasyTrip travel icon set: plane, train, bus and chalet (GLB).

Modelled Z-up in metres-ish units (each icon ~2 units long), then rotated to glTF's
Y-up on export. Every part keeps its own PBR material so the models stay editable
in Blender / Three.js.
"""
import sys
from pathlib import Path

import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix
from trimesh.visual.material import PBRMaterial

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "travel-icons")
OUT.mkdir(parents=True, exist_ok=True)

# EasyTrip palette (css/styles.css tokens) + a few natural accents
C = {
    "navy": "#001B48", "royal": "#02457A", "primary": "#0077A8", "sky": "#018ABE",
    "ice": "#E8F4FA", "white": "#F7FAFC", "grey": "#9AA7B6", "dark": "#1E2533",
    "amber": "#F2A900", "pine": "#1D6B57", "pine_dark": "#14503F",
    "wood": "#8B5A2B", "wood_dark": "#5E3B1C", "stone": "#7D7F84", "light": "#FFD27A",
    "sleeper": "#7A6A58",
}


def rgb(hex_):
    h = hex_.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def paint(mesh, colour, metallic=0.0, roughness=0.65):
    mesh.visual = trimesh.visual.TextureVisuals(material=PBRMaterial(
        name=colour, baseColorFactor=rgb(C[colour]) + [1.0],
        metallicFactor=metallic, roughnessFactor=roughness))
    return mesh


def box(ext, at, colour, **kw):
    m = trimesh.creation.box(extents=ext)
    m.apply_translation(at)
    return paint(m, colour, **kw)


def cyl(r, h, at, axis, colour, sections=24, **kw):
    """Cylinder of radius r, length h, along 'x', 'y' or 'z', centred at `at`."""
    m = trimesh.creation.cylinder(radius=r, height=h, sections=sections)
    if axis == "x":
        m.apply_transform(rotation_matrix(np.pi / 2, [0, 1, 0]))
    elif axis == "y":
        m.apply_transform(rotation_matrix(np.pi / 2, [1, 0, 0]))
    m.apply_translation(at)
    return paint(m, colour, **kw)


def rotated_box(ext, at, angle, axis, colour, **kw):
    m = trimesh.creation.box(extents=ext)
    m.apply_transform(rotation_matrix(angle, axis))
    m.apply_translation(at)
    return paint(m, colour, **kw)


def prism(points_yz, x0, x1, colour):
    """Extrude a triangle given in the YZ plane between x0 and x1 (gable ends)."""
    (ya, za), (yb, zb), (yc, zc) = points_yz
    v = np.array([[x0, ya, za], [x0, yb, zb], [x0, yc, zc],
                  [x1, ya, za], [x1, yb, zb], [x1, yc, zc]], dtype=float)
    f = [[0, 2, 1], [3, 4, 5], [0, 1, 4], [0, 4, 3], [1, 2, 5], [1, 5, 4], [2, 0, 3], [2, 3, 5]]
    m = trimesh.Trimesh(vertices=v, faces=f, process=True)
    trimesh.repair.fix_normals(m)
    return paint(m, colour)


def extrude_xz(points, y0, y1, colour, **kw):
    """Extrude a convex polygon given in the XZ plane (side view) from y0 to y1."""
    n = len(points)
    v = [[x, y0, z] for x, z in points] + [[x, y1, z] for x, z in points]
    f = [[0, i, i + 1] for i in range(1, n - 1)] + [[n, n + i + 1, n + i] for i in range(1, n - 1)]
    for i in range(n):
        j = (i + 1) % n
        f += [[i, j, n + j], [i, n + j, n + i]]
    m = trimesh.Trimesh(vertices=v, faces=f, process=True)
    trimesh.repair.fix_normals(m)
    return paint(m, colour, **kw)


def ellipsoid(radii, at, colour, **kw):
    m = trimesh.creation.icosphere(subdivisions=2, radius=1.0)
    m.apply_scale(radii)
    m.apply_translation(at)
    return paint(m, colour, **kw)


# ---------------------------------------------------------------- models (Z-up, nose +X)
def plane():
    parts = {}
    fus = trimesh.creation.capsule(radius=0.2, height=1.5, count=[16, 16])
    fus.apply_transform(rotation_matrix(np.pi / 2, [0, 1, 0]))
    parts["fuselage"] = paint(fus, "white", roughness=0.4)
    parts["window_stripe"] = cyl(0.203, 1.0, [0.05, 0, 0.0], "x", "royal", sections=16)
    parts["window_stripe"].apply_scale([1, 1, 0.25])  # a thin band around the middle
    parts["window_stripe"].apply_translation([0, 0, 0.06])
    parts["cockpit"] = ellipsoid([0.15, 0.14, 0.07], [0.7, 0, 0.15], "navy", roughness=0.2)
    # swept wings: two rotated slabs meeting under the fuselage
    for side, s in (("left", 1), ("right", -1)):
        parts[f"wing_{side}"] = rotated_box([0.42, 1.0, 0.045], [0.02, s * 0.58, -0.06],
                                            s * 0.35, [0, 0, 1], "primary")
        parts[f"engine_{side}"] = cyl(0.085, 0.32, [0.2, s * 0.52, -0.18], "x", "navy", sections=16)
        parts[f"stabiliser_{side}"] = rotated_box([0.22, 0.42, 0.035], [-0.78, s * 0.25, 0.04],
                                                  s * 0.4, [0, 0, 1], "primary")
    parts["tail_fin"] = rotated_box([0.36, 0.04, 0.42], [-0.8, 0, 0.3], 0.35, [0, 1, 0], "sky")
    return parts


def train():
    parts = {}
    parts["body"] = box([1.8, 0.6, 0.6], [-0.1, 0, 0.47], "primary", roughness=0.45)
    # side profile of the nose: flat front bottom, sloping windscreen up to the roof line
    parts["nose"] = extrude_xz([(0.79, 0.17), (1.08, 0.17), (1.08, 0.36), (0.79, 0.77)], -0.3, 0.3, "primary", roughness=0.45)
    parts["window_band"] = box([1.82, 0.62, 0.14], [-0.1, 0, 0.6], "navy", roughness=0.2)
    slope = np.array([0.79 - 1.08, 0.77 - 0.36]); length = np.linalg.norm(slope); d = slope / length
    normal = np.array([d[1], -d[0]]) if d[1] > 0 else np.array([-d[1], d[0]])
    centre = np.array([1.08, 0.36]) + slope * 0.55 + normal * 0.012
    parts["windscreen"] = rotated_box([length * 0.55, 0.5, 0.02], [centre[0], 0, centre[1]],
                                      np.arctan2(-d[1], d[0]), [0, 1, 0], "navy", roughness=0.2)
    parts["stripe"] = box([2.1, 0.62, 0.04], [0.04, 0, 0.3], "white")
    parts["roof"] = box([1.7, 0.46, 0.06], [-0.15, 0, 0.8], "ice")
    parts["pantograph"] = box([0.35, 0.04, 0.12], [-0.4, 0, 0.88], "grey", metallic=0.6)
    for i, x in enumerate((-0.75, -0.5, 0.4, 0.65)):
        for s in (1, -1):
            parts[f"wheel_{i}_{'l' if s > 0 else 'r'}"] = cyl(0.1, 0.07, [x, s * 0.27, 0.12], "y", "dark", sections=16)
    for s in (1, -1):
        parts[f"rail_{'l' if s > 0 else 'r'}"] = box([2.6, 0.05, 0.04], [0, s * 0.27, 0.03], "grey", metallic=0.7, roughness=0.35)
    for i, x in enumerate(np.arange(-1.2, 1.3, 0.3)):
        parts[f"sleeper_{i}"] = box([0.1, 0.78, 0.03], [x, 0, 0.0], "sleeper")
    return parts


def bus():
    parts = {}
    parts["body"] = box([2.0, 0.72, 0.72], [0, 0, 0.5], "amber", roughness=0.45)
    parts["window_band"] = box([1.55, 0.74, 0.28], [-0.17, 0, 0.64], "navy", roughness=0.2)
    parts["windscreen"] = box([0.04, 0.62, 0.36], [1.0, 0, 0.62], "navy", roughness=0.2)
    parts["door"] = box([0.3, 0.012, 0.5], [0.68, -0.362, 0.42], "royal", roughness=0.3)
    parts["stripe"] = box([2.02, 0.74, 0.05], [0, 0, 0.36], "white")
    parts["roof"] = box([1.9, 0.66, 0.07], [0, 0, 0.895], "white")
    for s in (1, -1):
        parts[f"headlight_{'l' if s > 0 else 'r'}"] = box([0.03, 0.14, 0.08], [1.01, s * 0.24, 0.26], "light", roughness=0.2)
        for x, name in ((0.62, "front"), (-0.62, "rear")):
            parts[f"wheel_{name}_{'l' if s > 0 else 'r'}"] = cyl(0.15, 0.12, [x, s * 0.33, 0.15], "y", "dark", sections=20)
            parts[f"hub_{name}_{'l' if s > 0 else 'r'}"] = cyl(0.07, 0.125, [x, s * 0.335, 0.15], "y", "grey", sections=12, metallic=0.6)
    return parts


def tree(x, y, scale=1.0, name="tree"):
    parts = {f"{name}_trunk": cyl(0.05 * scale, 0.2 * scale, [x, y, 0.2 * scale], "z", "wood_dark", sections=8)}
    for i, (r, z) in enumerate(((0.28, 0.45), (0.22, 0.68), (0.15, 0.88))):
        c = trimesh.creation.cone(radius=r * scale, height=0.34 * scale, sections=8)
        c.apply_translation([x, y, (z - 0.12) * scale])
        parts[f"{name}_crown_{i}"] = paint(c, "pine" if i != 1 else "pine_dark")
    snow = trimesh.creation.cone(radius=0.07 * scale, height=0.12 * scale, sections=8)
    snow.apply_translation([x, y, 1.0 * scale])
    parts[f"{name}_snow"] = paint(snow, "white")
    return parts


def chalet():
    parts = {}
    parts["snow_base"] = box([2.3, 2.0, 0.1], [0, 0, 0.05], "white", roughness=0.9)
    parts["walls"] = box([1.2, 1.0, 0.7], [0, 0, 0.45], "wood")
    ridge = 0.8 + 0.6 * np.tan(np.radians(35))
    parts["gable"] = prism([(-0.5, 0.8), (0.5, 0.8), (0, ridge - 0.02)], -0.6, 0.6, "wood")
    slope = 0.75 / np.cos(np.radians(35))
    for side, s in (("left", 1), ("right", -1)):
        centre_y, centre_z = s * 0.35, 0.8 + 0.35 * np.tan(np.radians(35)) + 0.03
        parts[f"roof_{side}"] = rotated_box([1.5, slope, 0.08], [0, centre_y, centre_z], -s * np.radians(35), [1, 0, 0], "navy")
        parts[f"roof_snow_{side}"] = rotated_box([1.45, slope * 0.9, 0.04], [0, centre_y * 0.98, centre_z + 0.06], -s * np.radians(35), [1, 0, 0], "white", roughness=0.9)
    parts["door"] = box([0.02, 0.28, 0.42], [0.61, 0, 0.31], "wood_dark")
    for s in (1, -1):
        parts[f"window_{'l' if s > 0 else 'r'}"] = box([0.02, 0.18, 0.18], [0.61, s * 0.32, 0.55], "light", roughness=0.2)
        parts[f"side_window_{'l' if s > 0 else 'r'}"] = box([0.2, 0.02, 0.18], [0.2 * s, 0.51, 0.55], "light", roughness=0.2)
    parts["chimney"] = box([0.15, 0.15, 0.4], [-0.3, 0.3, 1.25], "stone")
    parts.update(tree(0.85, -0.7, 0.9, "tree_a"))
    parts.update(tree(-0.85, 0.72, 1.1, "tree_b"))
    parts.update(tree(-0.9, -0.65, 0.7, "tree_c"))
    return parts


# ---------------------------------------------------------------- export
Y_UP = rotation_matrix(-np.pi / 2, [1, 0, 0])   # Z-up modelling → glTF Y-up


def normalise(parts):
    """Centre on X/Y and stand the model on the ground (min Z = 0)."""
    lo, hi = trimesh.util.concatenate([p.copy() for p in parts.values()]).bounds
    shift = [-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]]
    for p in parts.values():
        p.apply_translation(shift)
    return parts


def to_scene(models, spacing=3.0):
    scene = trimesh.Scene()
    for i, (name, parts) in enumerate(models):
        offset = (i - (len(models) - 1) / 2) * spacing
        for part, mesh in parts.items():
            m = mesh.copy()
            m.apply_translation([offset, 0, 0])
            m.apply_transform(Y_UP)
            scene.add_geometry(m, node_name=f"{name}_{part}", geom_name=f"{name}_{part}")
    return scene


models = [("plane", normalise(plane())), ("train", normalise(train())),
          ("bus", normalise(bus())), ("chalet", normalise(chalet()))]

for name, parts in models:
    path = OUT / f"travel-icon-{name}.glb"
    path.write_bytes(to_scene([(name, parts)]).export(file_type="glb"))
    joined = trimesh.util.concatenate(list(parts.values()))
    ext = joined.extents
    print(f"{path.name:26s} parts={len(parts):3d} verts={len(joined.vertices):5d} faces={len(joined.faces):5d} "
          f"size (L x W x H) = {ext[0]:.2f} x {ext[1]:.2f} x {ext[2]:.2f}  {path.stat().st_size / 1024:.0f} KB")

set_path = OUT / "travel-icons-set.glb"
set_path.write_bytes(to_scene(models).export(file_type="glb"))
print(f"{set_path.name:26s} all four, 3 units apart  {set_path.stat().st_size / 1024:.0f} KB")
