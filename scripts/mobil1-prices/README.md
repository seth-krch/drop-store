# Mobil 1 5W-20 daily prices (Kansas)

Scrapes today's Mobil 1 5W-20 prices and lists the cheapest ways to get it to
Kansas. Each total is price + shipping + Kansas sales tax. Kansas taxes delivery
charges, so the tax also applies to shipping.

```bash
npm run oil:prices                               # 5 qt shipped, 8.75% tax
npm run oil:prices -- --pickup                   # buy online, pick up in store (no shipping)
npm run oil:prices -- --quarts 6 --tax-rate 7.5  # your ZIP's combined rate
npm run oil:prices -- --line "high mileage"      # one product line only
npm run oil:prices -- --out oil-prices           # also write latest.md + history.jsonl
```

| Flag | Default | Meaning |
|---|---|---|
| `--quarts` | `5` | How much oil you need. The tool buys enough whole jugs/quarts to cover it |
| `--tax-rate` | `8.75` | Combined Kansas rate for your ZIP (`7.5` or `0.075`) |
| `--pickup` | off | Rank by in-store pickup price (no shipping) |
| `--line` | all | Filter: `advanced`, `high mileage`, `extended performance`, `advanced clean`, `truck` |
| `--top` | `10` | Rows in the main table |
| `--out` | none | Write `latest.md` and append to `history.jsonl` (enables "vs last run") |
| `--all-sellers` | off | Include Walmart marketplace sellers (their shipping is not modelled) |
| `--json` | off | Machine-readable output |

## Retailers

Search results are read with headless Chromium (Playwright). Plain HTTP requests get bot-blocked.

| Retailer | Status | Free shipping |
|---|---|---|
| Walmart | Works. A bot check appears on some visits, so each retailer gets up to 4 tries | $35+, else $6.99 |
| Home Depot | Works | $45+, else $8.99 |
| Advance Auto Parts | Works | $35+, else $8.99 |
| AutoZone, O'Reilly, NAPA, Target, Amazon | Block headless browsers. Not scraped | n/a |

Shipping rules are standard non-member rates in `prices.ts` (`SHIPPING`). Store pickup is free everywhere.
When a retailer can't be read, the report says so instead of failing silently.

## Daily report

`.github/workflows/oil-prices.yml` runs every morning (7:47 CDT) and on demand from the Actions
tab. It posts the report as a comment on the **Mobil 1 5W-20 daily prices** issue. Subscribe to that issue
to get each day's report by email or push notification. Set the repository variables `OIL_TAX_RATE` and
`OIL_QUARTS` to change the defaults. Scheduled workflows only run from the default branch.

To run it on your own machine instead, use cron:

```cron
47 7 * * * cd /path/to/drop-store && npm run -s oil:prices -- --out oil-prices
```
