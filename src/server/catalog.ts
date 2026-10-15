import "server-only";

import { env } from "~/env";
import type { CatalogItem } from "~/lib/catalog";
import { specsByCategory } from "~/lib/engine";
import { db } from "~/server/db";

export async function getCatalog(): Promise<CatalogItem[]> {
  const rows = await db.component.findMany({
    // Nel builder compaiono solo prodotti realmente in vendita: almeno
    // un'offerta disponibile in un negozio attivo.
    where: env.SHOW_UNAVAILABLE_PARTS
      ? undefined
      : { offers: { some: { inStock: true, retailer: { active: true } } } },
    orderBy: [{ category: "asc" }, { brand: "asc" }, { model: "asc" }],
    include: {
      offers: {
        where: { inStock: true, retailer: { active: true } },
        orderBy: { priceCents: "asc" },
        include: { retailer: { select: { name: true } } },
      },
    },
  });

  return rows.flatMap((row) => {
    const parsed = specsByCategory[row.category].safeParse(row.specs);
    if (!parsed.success) {
      // Un record sporco non deve rompere la pagina: lo saltiamo e lo segnaliamo.
      console.error(
        `Specifiche non valide per ${row.slug}`,
        parsed.error.issues,
      );
      return [];
    }
    return [
      {
        id: row.id,
        slug: row.slug,
        category: row.category,
        brand: row.brand,
        model: row.model,
        specs: parsed.data,
        offers: row.offers.map((o) => ({
          retailer: o.retailer.name,
          url: o.url,
          priceCents: o.priceCents,
          checkedAt: o.lastCheckedAt.toISOString(),
        })),
      } as CatalogItem,
    ];
  });
}
