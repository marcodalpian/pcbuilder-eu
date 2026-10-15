import { ExternalLink } from "lucide-react";

import { bestOffer, formatPrice, type CatalogItem } from "~/lib/catalog";

/** Prezzo migliore e negozio, allineato a destra nelle liste. */
export function PriceTag({ item }: { item: CatalogItem }) {
  const offer = bestOffer(item);
  if (!offer) {
    return <span className="text-faint text-xs">Senza prezzo</span>;
  }
  return (
    <span className="flex flex-col items-end">
      <span className="font-mono text-sm tabular-nums">
        {formatPrice(offer.priceCents)}
      </span>
      <span className="text-faint text-xs">{offer.retailer}</span>
    </span>
  );
}

/** Link al negozio con il prezzo migliore, sotto il componente scelto. */
export function OfferLink({ item }: { item: CatalogItem }) {
  const offer = bestOffer(item);
  if (!offer) return null;
  return (
    <a
      href={offer.url}
      target="_blank"
      // Quando i link diventeranno affiliati: aggiungere "sponsored" e l'avviso.
      rel="nofollow noopener noreferrer"
      className="text-muted hover:text-accent mt-1 inline-flex items-center gap-1.5 text-xs"
    >
      <span className="text-fg font-mono tabular-nums">
        {formatPrice(offer.priceCents)}
      </span>
      su {offer.retailer}
      <ExternalLink className="size-3" aria-hidden />
      <span className="sr-only">(si apre in una nuova scheda)</span>
    </a>
  );
}
