/**
 * Estrae prezzo e disponibilità dai dati strutturati schema.org (JSON-LD)
 * di una pagina prodotto. Funziona con qualsiasi negozio che li pubblica,
 * senza dipendere dall'HTML della pagina.
 */

export type ExtractedOffer = {
  priceCents: number;
  currency: string;
  inStock: boolean;
  /** Codice a barre (EAN/GTIN), se il negozio lo pubblica. */
  gtin?: string;
  mpn?: string;
  name?: string;
};

type Node = Record<string, unknown>;

const isNode = (v: unknown): v is Node =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asArray = (v: unknown): unknown[] =>
  Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];

/** "@type" può essere stringa o lista, e alcuni negozi lo scrivono minuscolo. */
const hasType = (node: Node, type: string) =>
  asArray(node["@type"]).some(
    (t) => typeof t === "string" && t.toLowerCase() === type.toLowerCase(),
  );

const str = (v: unknown) =>
  typeof v === "string"
    ? v.trim() || undefined
    : typeof v === "number"
      ? String(v)
      : undefined;

// Disponibile ora: il prodotto si può comprare e spedire. Preordini, ritiro
// solo in negozio e "in arrivo" non contano come in vendita.
const AVAILABLE = new Set(["instock", "limitedavailability", "onlineonly"]);

function parseAvailability(v: unknown): boolean | undefined {
  const s = str(v);
  if (!s) return undefined;
  const key = s.split(/[/:]/).pop()!.toLowerCase();
  return AVAILABLE.has(key);
}

/** "1958.0", 1958, "1.958,00" → centesimi. */
export function parsePriceCents(v: unknown): number | undefined {
  let s = str(v);
  if (!s) return undefined;
  s = s.replace(/[^\d.,]/g, "");
  if (s.includes(",")) {
    // Formato europeo: il punto separa le migliaia, la virgola i decimali.
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
}

function jsonLdBlocks(html: string): unknown[] {
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: unknown[] = [];
  for (const m of html.matchAll(re)) {
    try {
      out.push(JSON.parse(m[1]!));
    } catch {
      // Un blocco malformato non deve impedire di leggere gli altri.
    }
  }
  return out;
}

/** Tutti i nodi, appiattendo liste e "@graph". */
function* walk(v: unknown): Generator<Node> {
  for (const item of asArray(v)) {
    if (!isNode(item)) continue;
    yield item;
    if (item["@graph"]) yield* walk(item["@graph"]);
  }
}

type Candidate = {
  priceCents: number;
  currency?: string;
  inStock?: boolean;
  seller?: string;
};

/** Offerte concrete, anche annidate dentro un AggregateOffer (marketplace). */
function collectOffers(v: unknown, out: Candidate[] = []): Candidate[] {
  for (const node of asArray(v)) {
    if (!isNode(node)) continue;
    if (hasType(node, "AggregateOffer")) {
      const before = out.length;
      collectOffers(node.offers, out);
      // Solo il riepilogo, senza offerte dettagliate: uso il prezzo minimo.
      const low = parsePriceCents(node.lowPrice ?? node.price);
      if (out.length === before && low) {
        out.push({
          priceCents: low,
          currency: str(node.priceCurrency),
          inStock: Number(node.offerCount ?? 1) > 0 ? undefined : false,
        });
      }
      continue;
    }
    const priceSpec = isNode(node.priceSpecification)
      ? node.priceSpecification
      : undefined;
    const priceCents = parsePriceCents(node.price ?? priceSpec?.price);
    if (!priceCents) continue;
    const sellerNode = node.seller ?? node.offeredBy;
    out.push({
      priceCents,
      currency: str(node.priceCurrency ?? priceSpec?.priceCurrency),
      inStock: parseAvailability(node.availability),
      seller: isNode(sellerNode) ? str(sellerNode.name) : str(sellerNode),
    });
  }
  return out;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function extractOffer(
  html: string,
  options: {
    /**
     * Nome del negozio: nei marketplace preferisce l'offerta venduta da lui
     * rispetto a quelle di terzi, anche se più care.
     */
    seller?: string;
  } = {},
): ExtractedOffer | null {
  const products = jsonLdBlocks(html)
    .flatMap((b) => [...walk(b)])
    .filter((n) => hasType(n, "Product"));

  for (const product of products) {
    const offers = collectOffers(product.offers);
    if (offers.length === 0) continue;

    const own = options.seller
      ? offers.filter(
          (o) =>
            o.seller &&
            normalize(o.seller).includes(normalize(options.seller!)),
        )
      : [];
    const pool = own.length > 0 ? own : offers;
    // Tra i candidati: prima quelli disponibili, poi il prezzo più basso.
    const best = [...pool].sort(
      (a, b) =>
        Number(b.inStock === true) - Number(a.inStock === true) ||
        a.priceCents - b.priceCents,
    )[0]!;

    const gtin = ["gtin13", "gtin", "gtin12", "gtin14", "gtin8"]
      .map((k) => str(product[k])?.replace(/\D/g, ""))
      .find((g) => g && g.length >= 8);

    return {
      priceCents: best.priceCents,
      currency: best.currency ?? str(product.priceCurrency) ?? "EUR",
      // Disponibilità non dichiarata: non possiamo affermare che sia in vendita.
      inStock: best.inStock === true,
      gtin,
      mpn: str(product.mpn),
      name: str(product.name),
    };
  }
  return null;
}
