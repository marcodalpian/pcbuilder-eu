import { describe, expect, it } from "vitest";

import { extractOffer, parsePriceCents } from "./jsonld";

// Pagine minime che riproducono le strutture JSON-LD viste nei negozi reali.
const page = (...blocks: unknown[]) =>
  `<html><head>${blocks
    .map(
      (b) =>
        `<script type="application/ld+json">${typeof b === "string" ? b : JSON.stringify(b)}</script>`,
    )
    .join("")}</head><body>…</body></html>`;

describe("parsePriceCents", () => {
  it("gestisce stringhe, numeri e formato europeo", () => {
    expect(parsePriceCents("1958.0")).toBe(195800);
    expect(parsePriceCents(2758.24)).toBe(275824);
    expect(parsePriceCents("1.958,90")).toBe(195890);
    expect(parsePriceCents("€ 89,99")).toBe(8999);
    expect(parsePriceCents("0")).toBeUndefined();
    expect(parsePriceCents("gratis")).toBeUndefined();
  });
});

describe("extractOffer", () => {
  it("offerta singola con EAN (stile Alternate)", () => {
    const html = page([
      {
        "@context": "https://www.schema.org",
        "@type": "Product",
        name: "GeForce RTX 5080 AORUS INFINITY 16G",
        gtin8: "4719331357542",
        mpn: "GV-N5080AORUS IF-16GD",
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: "1958.0",
          availability: "OutOfStock",
        },
      },
    ]);
    expect(extractOffer(html)).toEqual({
      priceCents: 195800,
      currency: "EUR",
      inStock: false,
      gtin: "4719331357542",
      mpn: "GV-N5080AORUS IF-16GD",
      name: "GeForce RTX 5080 AORUS INFINITY 16G",
    });
  });

  it("marketplace: preferisce l'offerta del negozio anche se più cara (stile PcComponentes)", () => {
    const html = page({
      "@context": "https://schema.org",
      "@type": "product",
      gtin13: "0730143314381",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "2599.00",
        highPrice: "4051.43",
        offerCount: "3",
        offers: [
          {
            "@type": "Offer",
            price: "2599.00",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            offeredBy: { "@type": "Organization", name: "Venditore Terzo SRL" },
          },
          {
            "@type": "Offer",
            price: "2758.24",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            offeredBy: { "@type": "Organization", name: "PcComponentes" },
          },
        ],
      },
    });
    expect(extractOffer(html, { seller: "PcComponentes" })).toMatchObject({
      priceCents: 275824,
      inStock: true,
      gtin: "0730143314381",
    });
    // Senza indicare il negozio: la più conveniente disponibile.
    expect(extractOffer(html)?.priceCents).toBe(259900);
  });

  it("tra più offerte preferisce quelle disponibili", () => {
    const html = page({
      "@type": "Product",
      offers: [
        { "@type": "Offer", price: 100, availability: "OutOfStock" },
        {
          "@type": "Offer",
          price: 120,
          availability: "http://schema.org/InStock",
        },
      ],
    });
    expect(extractOffer(html)).toMatchObject({
      priceCents: 12000,
      inStock: true,
    });
  });

  it("preordine e disponibilità mancante non contano come in vendita", () => {
    const preorder = page({
      "@type": "Product",
      offers: { "@type": "Offer", price: "99", availability: "PreOrder" },
    });
    const unknown = page({
      "@type": "Product",
      offers: { "@type": "Offer", price: "99" },
    });
    expect(extractOffer(preorder)?.inStock).toBe(false);
    expect(extractOffer(unknown)?.inStock).toBe(false);
  });

  it("trova il prodotto dentro @graph, ignora blocchi malformati e non-prodotti", () => {
    const html = page(
      "{ questo non è json",
      { "@type": "BreadcrumbList", itemListElement: [] },
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", name: "Negozio" },
          {
            "@type": ["Product", "Thing"],
            offers: {
              "@type": "Offer",
              priceSpecification: { price: "49.90", priceCurrency: "EUR" },
              availability: "InStock",
            },
          },
        ],
      },
    );
    expect(extractOffer(html)).toMatchObject({
      priceCents: 4990,
      inStock: true,
    });
  });

  it("solo riepilogo AggregateOffer: usa il prezzo minimo ma non afferma la disponibilità", () => {
    const html = page({
      "@type": "Product",
      offers: { "@type": "AggregateOffer", lowPrice: "310.50", offerCount: 2 },
    });
    expect(extractOffer(html)).toMatchObject({
      priceCents: 31050,
      inStock: false,
    });
  });

  it("pagina senza dati strutturati → null", () => {
    expect(extractOffer("<html><body>Prodotto</body></html>")).toBeNull();
    expect(
      extractOffer(page({ "@type": "Product", name: "Senza offerte" })),
    ).toBeNull();
  });
});
