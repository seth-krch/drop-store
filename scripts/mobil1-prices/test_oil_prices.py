import unittest

from oil_prices import landed, markdown, money, ranked


class OilPrices(unittest.TestCase):
    def test_money(self):
        self.assertEqual(money("$31.97"), 31.97)
        self.assertEqual(money("$\n44\n.99"), 44.99)  # Advance splits dollars and cents

    def test_landed_taxes_shipping(self):
        self.assertEqual(landed("Walmart", 31.97, 8.75), (6.99, 42.37, 34.77))
        self.assertEqual(landed("Walmart", 35.97, 8.75), (0, 39.12, 39.12))

    def test_report_sorts_by_price_per_quart(self):
        rows = [("Walmart", "W1", 9.97, "u1", 1), ("Walmart", "W6", 39.48, "u2", 6)]
        text = markdown(ranked(rows, 8.75), ["AutoZone (blocked)"], 8.75)
        self.assertIn("Cheapest: Walmart 6 qt, $7.16/qt ($42.93 delivered)", text)
        self.assertLess(text.index("[W6]"), text.index("[W1]"))
        self.assertIn("Couldn't read: AutoZone", text)


if __name__ == "__main__":
    unittest.main()
