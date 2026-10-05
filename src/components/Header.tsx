import Link from "next/link";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";
import { nextDrop } from "@/lib/store";
import { dropTime } from "@/lib/format";
import { currentUser } from "@/lib/auth";
import { bagCount } from "@/lib/bag";

const NAV = [
  { href: "/shop?sort=newest", label: "New" },
  { href: "/shop/footwear", label: "Footwear" },
  { href: "/shop/tops", label: "Tops" },
  { href: "/shop/outerwear", label: "Outerwear" },
  { href: "/shop/bottoms", label: "Bottoms" },
  { href: "/shop/accessories", label: "Accessories" },
  { href: "/shop?sale=1", label: "Sale" },
];

export async function Header() {
  const [drop, user] = await Promise.all([nextDrop(), currentUser()]);
  const count = user ? await bagCount(user.id) : 0;
  return (
    <>
      <div className="announce">
        {drop ? (
          <>Drop {String(drop.number).padStart(2, "0")} · {drop.name} · {dropTime(drop.startsAt)} · <Link href={`/drops/${drop.slug}`}>Details</Link></>
        ) : (
          <>Free shipping on orders over $150</>
        )}
      </div>
      <header className="header">
        <div className="wrap header__in">
          <Link href="/" className="logo" aria-label="Mystic home"><Logo />MYSTIC</Link>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
            <Link href="/drops" className="hot">Drops</Link>
            <Link href="/journal">Journal</Link>
          </nav>
          <div className="tools">
            <SearchBox />
            <Link href={user ? "/account" : "/account/login"} aria-label={user ? `Account, ${user.name}` : "Sign in"}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></g></svg>
            </Link>
            <Link href="/bag" aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 8h14l-1 13H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></g></svg>
              <span>{count}</span>
            </Link>
            <Link href="/shop" className="menu-btn">Menu</Link>
          </div>
        </div>
      </header>
    </>
  );
}
