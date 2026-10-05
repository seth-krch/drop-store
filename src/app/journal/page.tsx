import type { Metadata } from "next";
import Link from "next/link";
import { listPosts } from "@/lib/store";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Journal", description: "Stories from Mystic." };

export default async function Journal() {
  const posts = await listPosts();
  return (
    <div className="wrap">
      <div className="shop__title" style={{ marginTop: 28 }}><h1 className="display">Journal</h1></div>
      <div className="posts" style={{ paddingBottom: 72 }}>
        {posts.map((p) => (
          <Link key={p.slug} href={`/journal/${p.slug}`} className="post-card">
            <div className="cover" style={{ background: p.tone }}><span className="display" style={{ fontSize: 40 }}>✦</span></div>
            <span className="mono muted">{shortDate(p.publishedAt)}</span>
            <h3>{p.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
