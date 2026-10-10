# Mobil 1 5W-20 daily prices (Kansas)

`oil_prices.py` opens each store's product page for Mobil 1 Advanced Full Synthetic 5W-20 (1 qt bottle),
reads the name and price, and lists them by delivered cost to Kansas: price + shipping +
Kansas sales tax. Kansas taxes shipping too.

```bash
pip install -r requirements.txt && python -m camoufox fetch
python oil_prices.py                  # 8.75% tax
python oil_prices.py --tax 7.5        # your ZIP's combined rate
python oil_prices.py --out report.md  # also save the report
```

It uses Camoufox if installed, otherwise Patchright (`pip install patchright && patchright install chromium`).
Patchright opens a visible browser because bot checks pass more often that way. On a server, run it under `xvfb-run`.

Each store is one small function in `SITES`. To track a different size or line, change the URL there.
Shipping rules (non-member, free over a threshold) are in `SHIPPING`.

| Store | Read from | Status (from a datacenter IP) |
|---|---|---|
| Walmart | `itemprop="price"` | Works |
| Amazon | `#corePrice… .a-offscreen` | Works |
| Home Depot | price component | Works |
| Advance Auto Parts | `price-box` | Works |
| AutoZone | JSON-LD | Blocked (403). May work from a home IP or with Camoufox |
| O'Reilly | JSON-LD | Blocked (Access Denied). Same as above |

Stores that can't be read are listed at the bottom of the report. They don't stop the run.

## Daily

`.github/workflows/oil-prices.yml` runs at 7:47 CDT (or on demand from the Actions tab). It posts the
report as a comment on the **Mobil 1 5W-20 daily prices** issue. Subscribe to it to get each day's prices.
Set the repository variable `OIL_TAX_RATE` for your ZIP. Scheduled workflows only run from the default branch.

Locally, use cron instead: `47 7 * * * cd /path/to/scripts/mobil1-prices && python oil_prices.py --out report.md`
