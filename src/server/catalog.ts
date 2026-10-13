import "server-only";

import type { CatalogItem } from "~/lib/catalog";
import { specsByCategory } from "~/lib/engine";
import { db } from "~/server/db";

export async function getCatalog(): Promise<CatalogItem[]> {
  const rows = await db.component.findMany({
    orderBy: [{ category: "asc" }, { brand: "asc" }, { model: "asc" }],
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
      } as CatalogItem,
    ];
  });
}
