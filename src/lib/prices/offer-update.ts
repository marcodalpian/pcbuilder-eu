import type { ExtractedOffer } from "./jsonld";

export type StoredOffer = {
  priceCents: number;
  currency: string;
  inStock: boolean;
};

export type OfferUpdatePlan = {
  data: StoredOffer;
  /** Nuovo punto nello storico solo se prezzo o disponibilità cambiano. */
  recordPricePoint: boolean;
};

/**
 * Decide cosa scrivere dopo aver letto una pagina prodotto. Lo storico serve
 * agli avvisi di ribasso: un punto per ogni variazione, non uno per controllo.
 */
export function planOfferUpdate(
  previous: StoredOffer | null,
  next: ExtractedOffer,
): OfferUpdatePlan {
  const data: StoredOffer = {
    priceCents: next.priceCents,
    currency: next.currency,
    inStock: next.inStock,
  };
  if (previous === null) return { data, recordPricePoint: true };
  const changed =
    previous.priceCents !== data.priceCents ||
    previous.currency !== data.currency ||
    previous.inStock !== data.inStock;
  return { data, recordPricePoint: changed };
}

/**
 * Il link curato a mano punta al prodotto giusto? Se il catalogo ha un EAN e
 * la pagina ne pubblica uno diverso, il link è sbagliato (o il negozio ha
 * riciclato l'URL): meglio non mostrare un prezzo che non corrisponde.
 */
export function gtinMismatch(
  expected: string | null | undefined,
  found: string | undefined,
): boolean {
  if (!expected || !found) return false;
  // Lo stesso EAN può comparire con o senza zeri iniziali (GTIN-13 vs GTIN-14).
  const strip = (g: string) => g.replace(/^0+/, "");
  return strip(expected) !== strip(found);
}
