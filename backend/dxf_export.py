"""Renders any equipment list as a real DXF file (opens in AutoCAD)."""
import ezdxf


def build_dxf(equipment, capacity_label, revision_label, out_path):
    doc = ezdxf.new("R2010")
    doc.header["$INSUNITS"] = 4  # millimeters
    for layer, color in [("EQUIPMENT", 5), ("TEXT", 7), ("PIPING", 3), ("REVISION", 1), ("TITLEBLOCK", 7)]:
        doc.layers.add(name=layer, color=color)

    msp = doc.modelspace()
    by_type = {}
    for e in equipment:
        by_type.setdefault(e["type"], []).append(e)

    for e in equipment:
        x, y, w, h = e["x"], e["y"], e["w"], e["h"]
        msp.add_lwpolyline([(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)],
                            dxfattribs={"layer": "EQUIPMENT"})
        msp.add_text(e["tag"], dxfattribs={"layer": "TEXT", "height": 3}).set_placement((x + 2, y + h - 5))
        msp.add_text(e["spec"], dxfattribs={"layer": "TEXT", "height": 2}).set_placement((x + 2, y + 2))
        if e.get("changed"):
            cx, cy = x + w / 2, y + h / 2
            msp.add_circle((cx, cy), radius=max(w, h) / 1.6, dxfattribs={"layer": "REVISION"})

    # simple flow piping: reception -> separator -> processing, at each row's mid-height
    def col_x(etype):
        return by_type[etype][0]["x"] if by_type.get(etype) else None

    sep_x = col_x("separator")
    proc_x = col_x("processing")
    if sep_x is not None:
        for e in by_type.get("reception", []):
            msp.add_line((e["x"] + e["w"], e["y"] + e["h"] / 2), (sep_x, e["y"] + e["h"] / 2),
                         dxfattribs={"layer": "PIPING"})
    if proc_x is not None:
        for e in by_type.get("separator", []):
            msp.add_line((e["x"] + e["w"], e["y"] + e["h"] / 2), (proc_x, e["y"] + e["h"] / 2),
                         dxfattribs={"layer": "PIPING"})

    max_x = max((e["x"] + e["w"] for e in equipment), default=160)
    msp.add_lwpolyline([(0, -30), (max_x, -30), (max_x, -10), (0, -10), (0, -30)],
                        dxfattribs={"layer": "TITLEBLOCK"})
    msp.add_text("MILK RECEPTION & SEPARATION P&ID",
                 dxfattribs={"layer": "TITLEBLOCK", "height": 3}).set_placement((4, -16))
    msp.add_text(f"Capacity: {capacity_label}   Revision: {revision_label}",
                 dxfattribs={"layer": "TITLEBLOCK", "height": 2.5}).set_placement((4, -22))

    doc.saveas(out_path)
    return out_path
