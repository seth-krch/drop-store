import Link from "next/link";
import { Newsletter } from "./Newsletter";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__top">
        <div>
          <h3>Drop alerts</h3>
          <p style={{ margin: 0, fontSize: 14, maxWidth: "40ch" }}>Get an email the day before every drop. No spam.</p>
          <Newsletter />
        </div>
        <div>
          <h3>Shop</h3>
          <ul>
            <li><Link href="/shop">All products</Link></li>
            <li><Link href="/shop/footwear">Footwear</Link></li>
            <li><Link href="/shop/tops">Tops</Link></li>
            <li><Link href="/shop/outerwear">Outerwear</Link></li>
            <li><Link href="/drops">Drops</Link></li>
          </ul>
        </div>
        <div>
          <h3>Help</h3>
          <ul>
            <li><Link href="/help">FAQ</Link></li>
            <li><Link href="/help#shipping">Shipping</Link></li>
            <li><Link href="/help#returns">Returns</Link></li>
            <li><Link href="/help#sizing">Size guide</Link></li>
          </ul>
        </div>
        <div>
          <h3>Mystic</h3>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/journal">Journal</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer__big" aria-hidden="true">MYSTIC</div>
      <div className="wrap footer__bottom">
        <span>© {new Date().getFullYear()} Mystic Supply Co.</span>
        <span>Prices in USD</span>
      </div>
    </footer>
  );
}
