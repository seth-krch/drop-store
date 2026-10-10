"""Today's cheapest Mobil 1 Advanced Full Synthetic 5W-20 (1 qt bottle), delivered to Kansas.

    python oil_prices.py [--tax 8.75] [--out report.md]

Uses Camoufox if installed, otherwise Patchright. Patchright runs a visible
browser (fewer bot checks), so on a server without a screen use `xvfb-run`.
"""
import argparse
import json
import re
import sys
import tempfile
from contextlib import ExitStack

# Kansas taxes shipping too. State 6.5% + local; pass your ZIP's rate with --tax.
TAX = 8.75

# (free shipping at, otherwise) for non-members. Store pickup is free.
SHIPPING = {
    "Walmart": (35, 6.99),
    "Amazon": (35, 6.99),
    "Home Depot": (45, 8.99),
    "Advance Auto Parts": (35, 8.99),
    "AutoZone": (35, 7.99),
    "O'Reilly": (35, 7.99),
}


def money(text):
    m = re.search(r"(\d+)\s*\.\s*(\d{2})", text)
    return float(f"{m[1]}.{m[2]}")


def walmart(page, url):
    page.goto(url)
    name = page.locator("h1#main-title").inner_text()
    price = page.locator('[itemprop="price"]').first.inner_text()
    return name, money(price)


def amazon(page, url):
    page.goto(url)
    name = page.locator("#productTitle").first.inner_text()
    price = page.locator("#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen")
    return name, money(price.first.text_content())


def home_depot(page, url):
    page.goto(url)
    name = page.locator("h1").first.inner_text()
    price = page.locator('[data-component^="price:Price"]:not(.sui-invisible)').first.inner_text()
    return name, money(price)


def advance(page, url):
    page.goto(url)
    name = page.locator("h1").first.inner_text()
    price = page.locator('[data-testid="price-box"]').first.inner_text()
    return name, money(price)


def json_ld(page, url):
    """Name and price from the page's schema.org Product data."""
    page.goto(url)
    for block in page.locator('script[type="application/ld+json"]').all_text_contents():
        for item in (lambda d: d if isinstance(d, list) else [d])(json.loads(block)):
            if item.get("@type") == "Product":
                offer = item["offers"][0] if isinstance(item["offers"], list) else item["offers"]
                return item["name"], float(offer["price"])
    raise ValueError(f"no Product data on page titled {page.title()!r}")


SITES = [
    ("Walmart", walmart, "https://www.walmart.com/ip/Mobil-1-Advanced-Full-Synthetic-Motor-Oil-5W-20-1-Quart/16767828"),
    ("Amazon", amazon, "https://www.amazon.com/dp/B000BARHOQ"),
    ("Home Depot", home_depot, "https://www.homedepot.com/p/Mobil-1-qt-Classic-5W-20-Synthetic-Motor-Oil-103008/333250613"),
    ("Advance Auto Parts", advance, "https://shop.advanceautoparts.com/p/mobil-1-advanced-full-synthetic-motor-oil-5w-20-1-quart-103008/8110007-P"),
    ("AutoZone", json_ld, "https://www.autozone.com/p/mobil-1-motor-oil-103008/628507"),
    ("O'Reilly", json_ld, "https://www.oreillyauto.com/detail/c/1-advanced/mobil-1-advanced-full-synthetic-motor-oil-5w-20-1-quart/mob8/1520"),
]


def launch(stack):
    try:
        from camoufox.sync_api import Camoufox
        # "virtual" (hidden Xvfb display) only exists on Linux; elsewhere show a window.
        return stack.enter_context(Camoufox(headless="virtual" if sys.platform == "linux" else False))
    except ImportError:
        from patchright.sync_api import sync_playwright
        pw = stack.enter_context(sync_playwright())
        return pw.chromium.launch_persistent_context(tempfile.mkdtemp(), headless=False, no_viewport=True)


def fetch_all(tries=3):
    rows, failed = [], []
    with ExitStack() as stack:
        browser = launch(stack)
        for store, fetch, url in SITES:
            for attempt in range(tries):
                page = browser.new_page()
                try:
                    rows.append((store, *fetch(page, url), url))
                    break
                except Exception as e:
                    if attempt == tries - 1:
                        failed.append(f"{store} ({str(e).splitlines()[0][:80]})")
                finally:
                    page.close()
    return rows, failed


def landed(store, price, tax):
    free_at, fee = SHIPPING[store]
    ship = 0 if price >= free_at else fee
    return ship, round((price + ship) * (1 + tax / 100), 2), round(price * (1 + tax / 100), 2)


def report(rows, failed, tax):
    rows = sorted(((landed(s, p, tax), s, n, p, u) for s, n, p, u in rows), key=lambda r: r[0][1])
    lines = [f"Mobil 1 5W-20, 1 qt, to Kansas ({tax}% tax, incl. on shipping)", ""]
    if rows:
        (ship, total, _), store, name, _, url = rows[0]
        lines += [f"**Cheapest: {store}, ${total:.2f} delivered**: {url}", ""]
    lines += ["| Store | Product | Price | Ship | Delivered | Pickup |", "|---|---|---|---|---|---|"]
    for (ship, total, pickup), store, name, price, url in rows:
        pick = "n/a" if store == "Amazon" else f"${pickup:.2f}"
        lines.append(f"| {store} | [{name.strip()}]({url}) | ${price:.2f} | ${ship:.2f} | **${total:.2f}** | {pick} |")
    if failed:
        lines += ["", "Couldn't read: " + "; ".join(failed)]
    return "\n".join(lines)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--tax", type=float, default=TAX, help="Kansas combined sales tax %% for your ZIP")
    ap.add_argument("--out", help="also write the report to this file")
    args = ap.parse_args()
    text = report(*fetch_all(), args.tax)
    print(text)
    if args.out:
        open(args.out, "w").write(text + "\n")
