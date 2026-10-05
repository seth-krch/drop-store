import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";
import { buildCatalog } from "./catalog.ts";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql, { schema });

const { drops, products, posts } = buildCatalog(new Date());

await db.transaction(async (tx) => {
  await tx.delete(schema.variants);
  await tx.delete(schema.products);
  await tx.delete(schema.drops);
  await tx.delete(schema.posts);

  const insertedDrops = await tx.insert(schema.drops).values(drops).returning({ id: schema.drops.id, slug: schema.drops.slug });
  const dropId = new Map(insertedDrops.map((d) => [d.slug, d.id]));

  for (const p of products) {
    const { sizes, dropSlug, ...row } = p;
    const [ins] = await tx
      .insert(schema.products)
      .values({ ...row, dropId: dropSlug ? dropId.get(dropSlug)! : null })
      .returning({ id: schema.products.id });
    await tx.insert(schema.variants).values(sizes.map((s, i) => ({ productId: ins.id, size: s.size, stock: s.stock, position: i })));
  }

  await tx.insert(schema.posts).values(posts);
});

console.log(`seeded ${drops.length} drops, ${products.length} products, ${posts.length} posts`);
await sql.end();
