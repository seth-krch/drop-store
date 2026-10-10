# Mobil 1 5W-20 price arbitrage (Kansas)

Ranks offers for Mobil 1 5W-20 by **landed cost per quart delivered to Kansas**,
then checks whether any resale channel pays more than that after fees and postage.

```bash
npm run oil:arbitrage                                   # 5 qt, statewide-average tax
npm run oil:arbitrage -- --quarts 10 --tax-rate 7.5 --zip 67202
npm run oil:arbitrage -- --file my-offers.json --json
npm run oil:arbitrage -- --refresh                      # try to re-read prices from offer URLs
```

| Flag | Default | Meaning |
|---|---|---|
| `--file` | `offers.json` here | Offers and resale channels |
| `--quarts` | `5` | Oil the order must cover (rounded up to whole units) |
| `--tax-rate` | `0.0875` | Combined Kansas rate for your ZIP (`7.5` or `0.075`) |
| `--cost-per-mile` | `0.70` | Round-trip driving cost for `pickup` offers |
| `--zip` | `Kansas` | Label only |
| `--refresh` | off | Fetch each offer `url` and read its JSON-LD price |
| `--json` | off | Machine-readable output |

## How landed cost is computed

`units × price + shipping + tax`. **Kansas taxes delivery charges**, so tax applies to
shipping too. The state rate is 6.5%, and local add-ons bring most ZIPs to between 7.5% and 10%,
so pass your ZIP's combined rate. Pickup offers add mileage, which is not taxed.

Shipping types: `free`, `flat {amount}`, `perUnit {amount}`,
`freeOver {threshold, otherwise}`, `pickup {roundTripMiles}`.

Resale channels: `price`, `feePct`, `feeFixed`, `outboundShipping` (postage per unit
out of Kansas). Profit = net per quart − cheapest landed per quart.

## Prices

The Walmart price in `offers.json` ($31.97 per 5 qt) was checked on 2026-10-10.
The other entries are marked `estimate, verify`. Update them before you act on the output.
Most retailers block scripted requests, so `--refresh` is best-effort: it keeps the
stored price and prints a warning when a page can't be read.
