import { PrismaClient } from "../generated/prisma";
import { parseSpecs } from "../src/lib/engine/specs";
import { seedComponents, seedRetailers } from "./seed-data";

const db = new PrismaClient();

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function main() {
  // Idempotente: rilanciarlo aggiorna i record esistenti invece di duplicarli.
  for (const r of seedRetailers) {
    await db.retailer.upsert({ where: { slug: r.slug }, create: r, update: r });
  }

  for (const comp of seedComponents) {
    const specs = parseSpecs(comp.category, comp.specs);
    const slug = slugify(`${comp.brand} ${comp.model}`);
    const data = {
      category: comp.category,
      brand: comp.brand,
      model: comp.model,
      specs,
    };
    await db.component.upsert({
      where: { slug },
      create: { ...data, slug },
      update: data,
    });
  }

  const [components, retailers] = await Promise.all([
    db.component.count(),
    db.retailer.count(),
  ]);
  console.log(
    `Seed completato: ${components} componenti, ${retailers} negozi.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
