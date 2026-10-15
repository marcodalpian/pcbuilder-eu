import type { PrismaClient } from "../../../generated/prisma";
import { extractOffer } from "~/lib/prices/jsonld";
import { gtinMismatch, planOfferUpdate } from "~/lib/prices/offer-update";

/** Link curato a mano: questo componente, in questo negozio, è a questo URL. */
export type OfferLink = {
  component: string; // slug del componente
  retailer: string; // slug del negozio
  url: string;
};

export type PageResult =
  | { ok: true; html: string }
  /** `gone`: la pagina non esiste più (404/410), il prodotto non è in vendita. */
  | { ok: false; error: string; gone?: boolean };

export type FetchPage = (url: string) => Promise<PageResult>;

export type RefreshReport = {
  updated: number;
  unchanged: number;
  failed: { url: string; error: string }[];
  warnings: string[];
};

export async function refreshOffers(
  db: PrismaClient,
  links: OfferLink[],
  fetchPage: FetchPage,
): Promise<RefreshReport> {
  const report: RefreshReport = {
    updated: 0,
    unchanged: 0,
    failed: [],
    warnings: [],
  };

  const [components, retailers] = await Promise.all([
    db.component.findMany({ select: { id: true, slug: true } }),
    db.retailer.findMany({ where: { active: true } }),
  ]);
  const componentId = new Map(components.map((c) => [c.slug, c.id]));
  const retailerBySlug = new Map(retailers.map((r) => [r.slug, r]));

  for (const link of links) {
    const cId = componentId.get(link.component);
    const retailer = retailerBySlug.get(link.retailer);
    if (!cId || !retailer) {
      report.warnings.push(
        `Link ignorato: ${!cId ? `componente "${link.component}"` : `negozio "${link.retailer}"`} sconosciuto o disattivato.`,
      );
      continue;
    }
    const where = {
      componentId_retailerId: { componentId: cId, retailerId: retailer.id },
    };
    const existing = await db.offer.findUnique({ where });

    const fail = async (error: string, gone = false) => {
      report.failed.push({ url: link.url, error });
      if (!existing) return;
      await db.offer.update({
        where,
        data: {
          lastError: error,
          lastCheckedAt: new Date(),
          // Pagina sparita: non è più in vendita. Errori temporanei
          // (rete, limiti di richieste) lasciano lo stato com'era.
          ...(gone && { inStock: false }),
        },
      });
    };

    const page = await fetchPage(link.url);
    if (!page.ok) {
      await fail(page.error, page.gone);
      continue;
    }
    const extracted = extractOffer(page.html, { seller: retailer.name });
    if (!extracted) {
      await fail("La pagina non contiene prezzo nei dati strutturati.");
      continue;
    }

    const plan = planOfferUpdate(existing, extracted);
    const data = {
      ...plan.data,
      url: link.url,
      gtin: extracted.gtin ?? null,
      lastCheckedAt: new Date(),
      lastError: null,
    };
    await db.$transaction(async (tx) => {
      const offer = await tx.offer.upsert({
        where,
        create: { ...data, componentId: cId, retailerId: retailer.id },
        update: data,
      });
      if (plan.recordPricePoint) {
        await tx.pricePoint.create({
          data: {
            offerId: offer.id,
            priceCents: offer.priceCents,
            inStock: offer.inStock,
          },
        });
      }
    });
    if (plan.recordPricePoint) report.updated++;
    else report.unchanged++;
  }

  report.warnings.push(...(await checkGtinConsistency(db)));
  return report;
}

/** Negozi diversi collegati allo stesso componente devono avere lo stesso EAN. */
async function checkGtinConsistency(db: PrismaClient): Promise<string[]> {
  const offers = await db.offer.findMany({
    where: { gtin: { not: null } },
    select: {
      gtin: true,
      url: true,
      component: { select: { slug: true } },
    },
  });
  const byComponent = new Map<string, typeof offers>();
  for (const o of offers) {
    const list = byComponent.get(o.component.slug) ?? [];
    list.push(o);
    byComponent.set(o.component.slug, list);
  }
  const warnings: string[] = [];
  for (const [slug, list] of byComponent) {
    const [first, ...rest] = list;
    const conflict = rest.find((o) => gtinMismatch(first!.gtin, o.gtin!));
    if (conflict) {
      warnings.push(
        `EAN diversi per "${slug}": ${first!.gtin} (${first!.url}) vs ${conflict.gtin} (${conflict.url}). Uno dei link punta al prodotto sbagliato.`,
      );
    }
  }
  return warnings;
}
