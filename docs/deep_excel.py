import pandas as pd
from pathlib import Path

base = Path(r"c:\Users\sewar\Downloads\test")
out_lines = []

def section(title):
    out_lines.append("\n" + "=" * 70)
    out_lines.append(title)
    out_lines.append("=" * 70)

# 1. Faris Al-Shihabi - trader statement
section("فراس الشهابي - totals")
df = pd.read_excel(base / "فراس الشهابي.xlsx", header=0)
df.columns = [str(c).strip() for c in df.columns]
numeric = ["ترسيم", "عمال", "وصل دور", "اتعاب", "سائق سوري", "سائق تركي", "مصاريف أخرى", "المجموع", "الدفعات"]
for c in numeric:
    if c in df.columns:
        df[c] = pd.to_numeric(df[c], errors="coerce")
out_lines.append(f"Rows: {len(df)}")
out_lines.append(f"Sum المجموع (charges): {df['المجموع'].sum():.2f}")
out_lines.append(f"Sum الدفعات: {df['الدفعات'].sum():.2f}")
out_lines.append(f"Balance (charges - payments): {df['المجموع'].sum() - df['الدفعات'].sum():.2f}")
out_lines.append("Sample charge row columns: " + str(list(df.columns)))
payment_rows = df[df["بضاعة"].astype(str).str.contains("دفعة", na=False)]
out_lines.append(f"Payment rows: {len(payment_rows)}")

# 2. Daily profit - month 3 daily rows
section("مربح يومي - شهر 3 sample days")
df = pd.read_excel(base / "مربح يومي.xlsx", sheet_name="شهر 3", header=3)
out_lines.append("Columns: " + " | ".join(str(c) for c in df.columns[:10]))
for i in range(4, min(15, len(df))):
    row = df.iloc[i]
    vals = [str(row.iloc[j]) if pd.notna(row.iloc[j]) else "" for j in range(min(10, len(row)))]
    if any(vals):
        out_lines.append(f"  R{i}: " + " | ".join(vals))

# 3. Juice agency - clearance sheet headers full
section("وكالة عصير طازج - تخليص full headers")
df = pd.read_excel(base / "وكالة عصير طازج.xlsx", sheet_name="تخليص", header=4)
out_lines.append("Columns (" + str(len(df.columns)) + "): " + " | ".join(str(c) for c in df.columns))

# 4. Broker dual view
section("مخلص باب الهوى - margin broker vs trader")
for sheet in ["مخلص", "تاجر"]:
    df = pd.read_excel(base / "مخلص باب الهوى.xlsx", sheet_name=sheet, header=4)
    total_row = None
    for i in range(len(df) - 5, len(df)):
        v = str(df.iloc[i, 0]) if pd.notna(df.iloc[i, 0]) else ""
        if "اجمالي" in v:
            out_lines.append(f"{sheet} total row: " + " | ".join(str(x) if pd.notna(x) else "" for x in df.iloc[i].values[:11]))

# 5. Inventory jard structure
section("جرد العيد 2026 - categories")
xl = pd.ExcelFile(base / "جرد العيد 2026.xlsx")
for sheet in xl.sheet_names:
    df = pd.read_excel(base / "جرد العيد 2026.xlsx", sheet_name=sheet, header=1)
    out_lines.append(f"\n[{sheet}] cols: " + " | ".join(str(c) for c in df.columns[:6]))

# 6. Porter cars - direct sale
section("سيارات بورتر - structure")
df = pd.read_excel(base / "سيارات بورتر.xlsx", sheet_name="1", header=2)
out_lines.append("Columns: " + " | ".join(str(c) for c in df.columns))

# 7. Spoilage juice
section("تلف طازج")
df = pd.read_excel(base / "تلف طازج.xlsx", header=None)
out_lines.append(str(df.to_string()))

Path(__file__).parent.joinpath("excel-deep-review.txt").write_text("\n".join(out_lines), encoding="utf-8")
print("done")
