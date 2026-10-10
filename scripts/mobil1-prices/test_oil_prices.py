import unittest

from oil_prices import delivered_per_qt, load_links, money, ranked, spread, to_price, walk


def offer(store, price, quarts=1, part="103008", min_qty=1, in_stock=None):
    return dict(part=part, line="Advanced", store=store, quarts=quarts, min_qty=min_qty, price=price,
                in_stock=in_stock, url=f"https://{store}/{price}", name=store, error="")


class OilPrices(unittest.TestCase):
    def test_prices(self):
        self.assertEqual(money("$\n44\n.99"), 44.99)  # Advance splits dollars and cents
        self.assertEqual(to_price("$10"), 10.0)
        self.assertEqual(to_price(9.99), 9.99)

    def test_delivered_includes_shipping_tax_and_min_qty(self):
        self.assertAlmostEqual(delivered_per_qt(offer("Walmart", 9.97), 8.75), (9.97 + 6.99) * 1.0875)
        self.assertAlmostEqual(delivered_per_qt(offer("Walmart", 47.00, quarts=6), 8.75), 47 * 1.0875 / 6)
        self.assertIsNone(delivered_per_qt(offer("Some Shop", 9.0), 8.75))

    def test_ranked_per_line_by_price_per_quart(self):
        rows = [offer("Walmart", 9.97), offer("Walmart", 47.0, quarts=6), offer("Gone", 1.0, in_stock=False),
                offer("Walmart", 9.97), dict(offer("Broken", None), error="blocked")]
        [(key, offers)] = ranked(rows, 8.75).items()
        self.assertEqual(key, ("Advanced", "103008"))
        self.assertEqual([(o["price"], o["quarts"]) for o in offers], [(47.0, 6), (9.97, 1)])

    def test_spread_alternates_sites(self):
        links = [dict(url=u) for u in ("https://a.com/1", "https://a.com/2", "https://b.com/1")]
        self.assertEqual([l["url"] for l in spread(links)], ["https://a.com/1", "https://b.com/1", "https://a.com/2"])

    def test_walk_finds_nested_items(self):
        doc = {"@graph": [{"@type": "ProductGroup", "hasVariant": [{"@type": "Product", "offers": {"price": "5"}}]}]}
        self.assertEqual([d.get("@type") for d in walk(doc)], [None, "ProductGroup", "Product", None])

    def test_links_file(self):
        links = load_links()
        self.assertGreater(len(links), 100)
        self.assertTrue(all(l["url"].startswith("http") and l["quarts"] >= 1 for l in links))


if __name__ == "__main__":
    unittest.main()
