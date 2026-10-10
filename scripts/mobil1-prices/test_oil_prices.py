import unittest

from oil_prices import landed, money, report


class OilPrices(unittest.TestCase):
    def test_money(self):
        self.assertEqual(money("$31.97"), 31.97)
        self.assertEqual(money("$\n44\n.99"), 44.99)  # Advance splits dollars and cents

    def test_landed_taxes_shipping(self):
        self.assertEqual(landed("Walmart", 31.97, 8.75), (6.99, 42.37, 34.77))
        self.assertEqual(landed("Walmart", 35.97, 8.75), (0, 39.12, 39.12))

    def test_report_sorts_by_delivered_total(self):
        rows = [("Advance Auto Parts", "A", 44.99, "u1"), ("Walmart", "W", 31.97, "u2")]
        text = report(rows, ["AutoZone (blocked)"], 8.75)
        self.assertIn("Cheapest: Walmart, $42.37", text)
        self.assertLess(text.index("| Walmart"), text.index("| Advance"))
        self.assertIn("Couldn't read: AutoZone", text)


if __name__ == "__main__":
    unittest.main()
