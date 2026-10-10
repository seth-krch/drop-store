# Mobil 1 5W-20 daily prices

`oil_prices.py` checks **192 product links across 75 stores** for Mobil 1 5W-20 in 1 qt bottles,
covering single bottles and packs of them. It shows the cheapest offers for each product line:

| Part | Line |
|---|---|
| 103008 | Advanced Full Synthetic |
| 120455 | High Mileage |
| 102989 | Extended Performance |
| 124574 | Truck & SUV |
| 128645 | Advanced Clean |

Offers are ranked by **item price per quart** (before shipping and tax). For stores whose
shipping rules are known (`SHIPPING` in the script), a **Delivered/qt** column adds shipping to
Kansas plus Kansas sales tax, which also applies to shipping. Every other store shows `?`.
Out-of-stock offers are left out. Duplicate listings of the same item at the same price are shown once.

## Run it

```powershell
pip install -r requirements.txt
python -m camoufox fetch
python oil_prices.py                  # everything, top 5 per line
python oil_prices.py --part 103008    # one product line
python oil_prices.py --only ebay.com  # one site (handy for testing)
python oil_prices.py --tax 7.5        # your ZIP's combined sales tax
```

Or double-click `run_prices.cmd`. It runs the check, then opens the report.

Each run:
- prints a table per product line, followed by a list of the stores it couldn't read;
- saves the same tables to `report.html`, with clickable store names;
- appends every result, including failures, to `history.csv`.

A full run visits all 192 links one at a time with short pauses. It cycles through the stores so
it never hits the same one twice in a row, and takes roughly 20–30 minutes.

## Run it every morning (Windows)

Run this once in PowerShell, with the path changed to wherever you cloned the repo:

```powershell
schtasks /create /tn "Mobil1Prices" /sc daily /st 06:30 /tr "\"$HOME\Documents\oil-check\scripts\mobil1-prices\run_prices.cmd\""
```

The PC has to be on and you have to be logged in, because the browser opens a window. To run it
right away: `schtasks /run /tn "Mobil1Prices"`. To remove it: `schtasks /delete /tn "Mobil1Prices"`.

If the old Hermes task (`HermesMobilDailyPrices`, 06:00) is still scheduled, both will open
browsers every morning. Turn the old one off with `schtasks /change /tn HermesMobilDailyPrices /disable`.

## Adding or fixing links

All links are in `links.csv`, which you can edit in Excel. Columns:

| Column | Meaning |
|---|---|
| `part`, `line` | Which product it is |
| `store` | Name shown in the report |
| `quarts` | Quarts in one listing (1 for a bottle, 6 for a 6-pack) |
| `min_qty` | Minimum number you must buy (some dealers sell singles only in 6s) |
| `url` | Product page |
| `hermes_status` | Result in the last Hermes run, for reference |

Most stores are read by `generic()`, which tries schema.org product data, then Shopify's product
JSON, then price meta tags. Stores that need special handling have their own small function in
`READERS`: Walmart, Amazon, Home Depot, Advance Auto, eBay and DB Supply.

## What fails

Many big stores block automated browsers, especially from datacenter IPs. These include AutoZone, O'Reilly,
NAPA, Lowe's, Summit, JEGS, Menards, Grainger, Ace, BJ's and Farm & Fleet. Hermes got several of
them from a home connection, so expect more to work on your PC than in a cloud test. Failures are
listed at the bottom of the report and never stop the run.
