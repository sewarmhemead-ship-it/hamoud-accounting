import json
from pathlib import Path

p = Path(__file__).parent / "excel-summary.json"
data = json.loads(p.read_text(encoding="utf-8"))
lines = []
for item in data:
    lines.append("=" * 70)
    lines.append(item["file"])
    lines.append("Sheets: " + ", ".join(item["sheets"]))
    for s in item["sheet_data"]:
        lines.append(f"  [{s['sheet']}] {s['shape'][0]}x{s['shape'][1]} header@{s['header_row']}")
        hdr = [h for h in s["headers"] if h][:15]
        if hdr:
            lines.append("  Headers: " + " | ".join(hdr))
        if s["tail"]:
            lines.append("  Tail:")
            for t in s["tail"][-5:]:
                cells = [c for c in t["cells"] if c][:12]
                lines.append("    " + " | ".join(cells))
    lines.append("")

out = Path(__file__).parent / "excel-review.txt"
out.write_text("\n".join(lines), encoding="utf-8")
print("Wrote", out)
