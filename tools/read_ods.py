"""Dump every sheet of the Wärmepumpen Rechner ODS so we can understand it."""
import pandas as pd

PATH = "Wärmepumpen Rechner.ods"

sheets = pd.read_excel(PATH, sheet_name=None, header=None, engine="odf")
for name, df in sheets.items():
    print("=" * 80)
    print(f"SHEET: {name!r}  shape={df.shape}")
    print("=" * 80)
    # Print non-empty rows with their index
    with pd.option_context("display.max_rows", None, "display.max_columns", None, "display.width", 200):
        print(df.to_string())
    print()
