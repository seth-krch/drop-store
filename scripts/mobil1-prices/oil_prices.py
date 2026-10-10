"""Cheapest Mobil 1 5W-20 in 1 qt bottles (singles and packs) across ~80 stores, per product line.

    python oil_prices.py [--tax 8.75] [--part 103008] [--only walmart.com] [--top 5]

Links live in links.csv (part, line, store, quarts, min_qty, url). Offers are ranked by item
price per quart; a delivered-to-Kansas price is shown where the store's shipping rule is known.
Also saves report.html (the same tables) and appends every result to history.csv.

Uses Camoufox if installed, otherwise Patchright. Patchright runs a visible
browser (fewer bot checks), so on a server without a screen use `xvfb-run`.
"""
import argparse
import csv
import datetime
import functools
import html
import itertools
import json
import random
import re
import sys
import tempfile
from contextlib import ExitStack
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).parent

# Kansas taxes shipping too. State 6.5% + local; pass your ZIP's rate with --tax.
TAX = 8.75

# (free shipping at, otherwise) for non-members. Unknown for every other store.
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


# Each reader returns (name, price, in_stock) with in_stock None when the page doesn't say.

def walmart(page, url):
    page.goto(url)
    name = page.locator("h1#main-title").inner_text()
    price = page.locator('[itemprop="price"]').first.inner_text()
    return name, money(price), None


def amazon(page, url):
    page.goto(url)
    name = page.locator("#productTitle").first.inner_text()
    price = page.locator("#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen")
    if not price.count():
        raise ValueError("no Amazon price (unavailable, or only other sellers)")
    return name, money(price.first.text_content()), None


def home_depot(page, url):
    page.goto(url)
    name = page.locator("h1").first.inner_text()
    price = page.locator('[data-component^="price:Price"]:not(.sui-invisible)').first.inner_text()
    return name, money(price), None


def advance(page, url):
    page.goto(url)
    name = page.locator("h1").first.inner_text()
    price = page.locator('[data-testid="price-box"]').first.inner_text()
    return name, money(price), None


def ebay(page, url):
    page.goto(url)
    name = page.locator("h1.x-item-title__mainTitle").first.inner_text()
    price = page.locator(".x-price-primary").first.inner_text()
    if "US $" not in price and not price.lstrip().startswith("$"):
        raise ValueError(f"not a US dollar price: {price!r}")
    return name, money(price), None


def db_supply(page, url):
    page.goto(url)
    data = json.loads(page.locator("script#__NEXT_DATA__").text_content())
    p = data["props"]["pageProps"]["productPageData"]["stores"]["default"]["productData"]
    return p["name"], p["price_range"]["minimum_price"]["final_price"]["value"], p["stock_status"] == "IN_STOCK"


def generic(page, url, part=""):
    """Most stores: schema.org Product data, Shopify's product JSON, or price meta tags."""
    page.goto(url)
    try:  # some stores add their product data a moment after the page loads
        page.wait_for_selector('script[type="application/ld+json"]', state="attached", timeout=5000)
    except Exception:
        pass
    for read in (from_json_ld, from_shopify, from_meta):
        found = read(page, url, part)
        if found:
            return found
    raise ValueError("no price found on page")


def from_json_ld(page, url, part=""):
    found = []
    for block in page.locator('script[type="application/ld+json"]').all_text_contents():
        for item in walk(parse(block)):
            for offer in walk(item.get("offers")) if "Product" in str(item.get("@type")) else []:
                if offer.get("price") or offer.get("lowPrice"):
                    stock = str(offer.get("availability", "")) or None
                    found.append((part not in json.dumps(item), item.get("name", ""),
                                  to_price(offer.get("price") or offer["lowPrice"]), stock and "InStock" in stock))
    # Stores that list every size as a variant: prefer the one that names this part number.
    return min(found, key=lambda f: f[0])[1:] if found else None


def from_shopify(page, url, part=""):
    if "/products/" not in url:
        return None
    resp = page.request.get(url.split("?")[0].rstrip("/") + ".js")
    if not resp.ok or "json" not in resp.headers.get("content-type", ""):
        return None
    data, wanted = resp.json(), re.search(r"variant=(\d+)", url)
    v = next((v for v in data["variants"] if wanted and str(v["id"]) == wanted[1]), data["variants"][0])
    return data["title"], v["price"] / 100, v["available"]


def from_meta(page, url, part=""):
    price = page.locator('meta[property$="price:amount"], [itemprop="price"]').first
    if not price.count():
        return None
    value = price.get_attribute("content") or price.inner_text()
    title = page.locator('meta[property="og:title"]').first
    name = title.get_attribute("content") if title.count() else page.title()
    return name, to_price(value), None


def to_price(value):
    return float(re.sub(r"[^\d.]", "", str(value)))


def parse(text):
    try:
        return json.loads(text, strict=False)
    except ValueError:
        return None


def walk(node):
    """Every dict inside a JSON-LD document, however deeply nested (@graph, hasVariant, …)."""
    if isinstance(node, list):
        for n in node:
            yield from walk(n)
    elif isinstance(node, dict):
        yield node
        for value in node.values():
            yield from walk(value)


READERS = {"walmart.com": walmart, "amazon.com": amazon, "homedepot.com": home_depot,
           "shop.advanceautoparts.com": advance, "ebay.com": ebay, "dbsupply.com": db_supply}


def domain(url):
    return urlparse(url).netloc.lower().removeprefix("www.")


def load_links(part=None, only=None):
    with open(HERE / "links.csv", newline="", encoding="utf-8") as f:
        links = [dict(r, quarts=int(r["quarts"]), min_qty=int(r["min_qty"])) for r in csv.DictReader(f)]
    return [l for l in links if (not part or l["part"] == part) and (not only or only in domain(l["url"]))]


def spread(links):
    """Round-robin by site so the same store is never hit twice in a row (bot checks)."""
    by_site = {}
    for link in links:
        by_site.setdefault(domain(link["url"]), []).append(link)
    rounds = itertools.zip_longest(*by_site.values())
    return [link for batch in rounds for link in batch if link]


def launch(stack):
    try:
        from camoufox.sync_api import Camoufox
        # "virtual" (hidden Xvfb display) only exists on Linux; elsewhere show a window.
        return stack.enter_context(Camoufox(headless="virtual" if sys.platform == "linux" else False))
    except ImportError:
        from patchright.sync_api import sync_playwright
        pw = stack.enter_context(sync_playwright())
        return pw.chromium.launch_persistent_context(tempfile.mkdtemp(), headless=False, no_viewport=True)


# Page titles of bot checks and block pages. Retrying these right away never helps.
BLOCKED = re.compile(r"^$|just a moment|access denied|robot or human|pardon our interruption|captcha|forbidden|^[\w.]+\.com$", re.I)


def fetch(browser, link, tries=2):
    read = READERS.get(domain(link["url"])) or functools.partial(generic, part=link["part"])
    for attempt in range(tries):
        page = browser.new_page()
        page.set_default_timeout(15_000)
        page.wait_for_timeout(random.randint(1000, 2500))
        try:
            name, price, stock = read(page, link["url"])
            return dict(link, name=html.unescape(name).strip(), price=price, in_stock=stock, error="")
        except Exception as e:
            title = page.title()
            error = f"{str(e).splitlines()[0][:60]}; page: {title[:40]!r}"
            if BLOCKED.search(title):
                break
        finally:
            page.close()
    return dict(link, name="", price=None, in_stock=None, error=error)


def fetch_all(links):
    from rich.progress import track

    with ExitStack() as stack:
        browser = launch(stack)
        return [fetch(browser, link) for link in track(spread(links), description="Checking prices")]


def delivered_per_qt(r, tax):
    """Cheapest order the store allows, shipped to Kansas with tax, per quart. None if shipping unknown."""
    if r["store"] not in SHIPPING:
        return None
    free_at, fee = SHIPPING[r["store"]]
    order = r["price"] * r["min_qty"]
    ship = 0 if order >= free_at else fee
    return (order + ship) * (1 + tax / 100) / (r["quarts"] * r["min_qty"])


def ranked(results, tax):
    """{line: offers cheapest per quart first}. Out-of-stock and duplicate listings are left out."""
    by_line, seen = {}, set()
    for r in sorted((r for r in results if r["price"] and r["in_stock"] is not False), key=lambda r: r["price"] / r["quarts"]):
        key = (r["part"], r["store"], r["quarts"], r["price"])
        if key not in seen:
            seen.add(key)
            by_line.setdefault((r["line"], r["part"]), []).append(dict(r, per_qt=r["price"] / r["quarts"], delivered=delivered_per_qt(r, tax)))
    return by_line


def show(console, by_line, results, tax, top):
    from rich import box
    from rich.table import Table

    for (line, part), offers in by_line.items():
        table = Table(title=f"Mobil 1 {line} 5W-20 ({part})", box=box.SIMPLE_HEAD, title_justify="left")
        # Numbers keep their width; long store and product names are cut with "…" instead.
        table.add_column("Store", no_wrap=True, overflow="ellipsis", max_width=18)
        for col in ("Qts", "Price", "Per qt", "Delivered/qt"):
            table.add_column(col, justify="right", no_wrap=True)
        table.add_column("Product", no_wrap=True, overflow="ellipsis", max_width=max(5, console.width - 68))
        for i, r in enumerate(offers[:top]):
            qts = f"{r['quarts']}×{r['min_qty']}" if r["min_qty"] > 1 else str(r["quarts"])
            delivered = "?" if r["delivered"] is None else f"${r['delivered']:.2f}"
            table.add_row(f"[link={r['url']}]{r['store']}[/link]", qts, f"${r['price']:.2f}",
                          f"[bold]${r['per_qt']:.2f}[/bold]", delivered, r["name"], style="green" if i == 0 else None)
        console.print(table)
    failed = [r for r in results if r["error"]]
    console.print(f"Read {len(results) - len(failed)} of {len(results)} links. Per qt is before shipping and tax; "
                  f"Delivered/qt adds shipping to Kansas and {tax}% tax where the store's shipping is known (? = unknown).")
    if failed:
        counts = sorted({r["store"] for r in failed}, key=lambda s: -sum(f["store"] == s for f in failed))
        console.print("[red]Couldn't read:[/red] " + ", ".join(f"{s} ×{sum(f['store'] == s for f in failed)}" for s in counts))


def save_history(results):
    path = HERE / "history.csv"
    fields = ["date", "part", "line", "store", "quarts", "min_qty", "price", "in_stock", "url", "name", "error"]
    new = not path.exists()
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        if new:
            w.writeheader()
        w.writerows(dict(r, date=datetime.date.today().isoformat()) for r in results)


if __name__ == "__main__":
    from rich.console import Console

    ap = argparse.ArgumentParser()
    ap.add_argument("--tax", type=float, default=TAX, help="Kansas combined sales tax %% for your ZIP")
    ap.add_argument("--part", help="only this part number, e.g. 103008")
    ap.add_argument("--only", help="only links whose site contains this, e.g. walmart.com")
    ap.add_argument("--top", type=int, default=5, help="offers to show per product line")
    args = ap.parse_args()
    results = fetch_all(load_links(args.part, args.only))
    console = Console(record=True)
    show(console, ranked(results, args.tax), results, args.tax, args.top)
    console.save_html(str(HERE / "report.html"))
    save_history(results)
