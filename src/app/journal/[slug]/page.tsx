import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/store";
import { shortDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  return p ? { title: p.title, description: p.excerpt } : {};
}

export default async function PostPage({ params }: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) notFound();
  return (
    <div className="wrap">
      <article className="prose">
        <p className="mono muted"><Link href="/journal">Journal</Link> · {shortDate(p.publishedAt)}</p>
        <h1 className="display">{p.title}</h1>
        <p style={{ fontSize: 19 }} className="muted">{p.excerpt}</p>
        <div style={{ background: p.tone, aspectRatio: "16 / 7", margin: "28px 0" }} aria-hidden="true" />
        {p.body.map((para, i) => <p key={i}>{para}</p>)}
      </article>
    </div>
  );
}
