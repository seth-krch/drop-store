"""Today's cheapest Mobil 1 Advanced Full Synthetic 5W-20 in 1 qt bottles (singles and packs),
delivered to Kansas, ranked by price per quart.

    python oil_prices.py [--tax 8.75] [--out report.md]

Uses Camoufox if installed, otherwise Patchright. Patchright runs a visible
browser (fewer bot checks), so on a server without a screen use `xvfb-run`.
"""
import argparse
import json
import random
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
    "Advance Auto": (35, 8.99),
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
    if not price.count():
        raise ValueError("no Amazon price (unavailable, or only other sellers)")
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


# (store, reader, product link, quarts in the listing). Only 1 qt bottles and packs of them.
# Same-store links are spread out: back-to-back visits trip Walmart's and Amazon's bot checks.
SITES = [
    ("Walmart", walmart, "https://www.walmart.com/ip/Mobil-1-Advanced-Full-Synthetic-Motor-Oil-5W-20-1-Quart/16767828", 1),
    ("Amazon", amazon, "https://www.amazon.com/dp/B000BARHOQ", 1),
    ("Home Depot", home_depot, "https://www.homedepot.com/p/Mobil-1-qt-Classic-5W-20-Synthetic-Motor-Oil-103008/333250613", 1),
    ("Walmart", walmart, "https://www.walmart.com/ip/5-pack-Mobil-1-Advanced-Full-Synthetic-Motor-Oil-5W-20-1-Quart/17930365643", 5),
    ("Advance Auto", advance, "https://shop.advanceautoparts.com/p/mobil-1-advanced-full-synthetic-motor-oil-5w-20-1-quart-103008/8110007-P", 1),
    ("Amazon", amazon, "https://www.amazon.com/dp/B000SM6OD2", 6),
    ("AutoZone", json_ld, "https://www.autozone.com/p/mobil-1-motor-oil-103008/628507", 1),
    ("Walmart", walmart, "https://www.walmart.com/ip/Mobil-1-Advanced-Full-Synthetic-Motor-Oil-5W-20-1-qt-6-Pack/164214023", 6),
    ("O'Reilly", json_ld, "https://www.oreillyauto.com/detail/c/1-advanced/mobil-1-advanced-full-synthetic-motor-oil-5w-20-1-quart/mob8/1520", 1),
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
        for store, fetch, url, qts in SITES:
            for attempt in range(tries):
                page = browser.new_page()
                page.set_default_timeout(15_000)
                page.wait_for_timeout(random.randint(1500, 4000))  # don't hammer stores back to back
                try:
                    rows.append((store, *fetch(page, url), url, qts))
                    break
                except Exception as e:
                    if attempt == tries - 1:
                        failed.append(f"{store} {qts} qt ({str(e).splitlines()[0][:60]}; page: {page.title()[:40]!r})")
                finally:
                    page.close()
    return rows, failed


def landed(store, price, tax):
    free_at, fee = SHIPPING[store]
    ship = 0 if price >= free_at else fee
    return ship, round((price + ship) * (1 + tax / 100), 2), round(price * (1 + tax / 100), 2)


def ranked(rows, tax):
    """Dicts per listing, cheapest delivered price per quart first."""
    out = []
    for store, name, price, url, qts in rows:
        ship, total, pickup = landed(store, price, tax)
        out.append(dict(store=store, name=name.strip(), qts=qts, price=price, ship=ship, total=total,
                        pickup=None if store == "Amazon" else pickup, per_qt=total / qts, url=url))
    return sorted(out, key=lambda r: r["per_qt"])


def show(rows, failed, tax):
    from rich import box
    from rich.console import Console
    from rich.table import Table

    console = Console()
    table = Table(title=f"Mobil 1 5W-20 1 qt bottles, to Kansas ({tax}% tax incl. shipping)", box=box.SIMPLE_HEAD)
    table.add_column("Store", no_wrap=True)
    for col in ("Qts", "Price", "Ship", "Delivered", "Per qt", "Pickup"):
        table.add_column(col, justify="right", no_wrap=True)
    # The numbers take ~75 columns; the product name gets whatever is left and is cut with "…".
    table.add_column("Product", no_wrap=True, overflow="ellipsis", max_width=max(5, console.width - 76))
    for i, r in enumerate(rows):
        pickup = "n/a" if r["pickup"] is None else f"${r['pickup']:.2f}"
        table.add_row(f"[link={r['url']}]{r['store']}[/link]", str(r["qts"]), f"${r['price']:.2f}", f"${r['ship']:.2f}",
                      f"${r['total']:.2f}", f"[bold]${r['per_qt']:.2f}[/bold]", pickup, r["name"],
                      style="green" if i == 0 else None)
    console.print(table)
    if failed:
        console.print("[red]Couldn't read:[/red] " + "; ".join(failed))


def markdown(rows, failed, tax):
    lines = [f"Mobil 1 5W-20 1 qt bottles, to Kansas ({tax}% tax, incl. on shipping)", ""]
    if rows:
        b = rows[0]
        lines += [f"**Cheapest: {b['store']} {b['qts']} qt, ${b['per_qt']:.2f}/qt (${b['total']:.2f} delivered)**: {b['url']}", ""]
    lines += ["| Store | Qts | Price | Ship | Delivered | Per qt | Pickup | Product |", "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        pickup = "n/a" if r["pickup"] is None else f"${r['pickup']:.2f}"
        lines.append(f"| {r['store']} | {r['qts']} | ${r['price']:.2f} | ${r['ship']:.2f} | ${r['total']:.2f} | "
                     f"**${r['per_qt']:.2f}** | {pickup} | [{r['name']}]({r['url']}) |")
    if failed:
        lines += ["", "Couldn't read: " + "; ".join(failed)]
    return "\n".join(lines)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--tax", type=float, default=TAX, help="Kansas combined sales tax %% for your ZIP")
    ap.add_argument("--out", help="also write a markdown report to this file")
    args = ap.parse_args()
    found, failed = fetch_all()
    rows = ranked(found, args.tax)
    show(rows, failed, args.tax)
    if args.out:
        open(args.out, "w", encoding="utf-8").write(markdown(rows, failed, args.tax) + "\n")
