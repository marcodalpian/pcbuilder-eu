import { describe, expect, it } from "vitest";

import { gtinMismatch, planOfferUpdate } from "./offer-update";

const extracted = {
  priceCents: 49990,
  currency: "EUR",
  inStock: true,
};

describe("planOfferUpdate", () => {
  it("prima lettura: salva e apre lo storico", () => {
    expect(planOfferUpdate(null, extracted)).toEqual({
      data: { priceCents: 49990, currency: "EUR", inStock: true },
      recordPricePoint: true,
    });
  });

  it("nessuna variazione: aggiorna l'offerta ma non lo storico", () => {
    const prev = { priceCents: 49990, currency: "EUR", inStock: true };
    expect(planOfferUpdate(prev, extracted).recordPricePoint).toBe(false);
  });

  it("cambio di prezzo o di disponibilità: nuovo punto nello storico", () => {
    const prev = { priceCents: 52990, currency: "EUR", inStock: true };
    expect(planOfferUpdate(prev, extracted).recordPricePoint).toBe(true);
    expect(
      planOfferUpdate({ ...prev, priceCents: 49990, inStock: false }, extracted)
        .recordPricePoint,
    ).toBe(true);
  });
});

describe("gtinMismatch", () => {
  it("segnala EAN diversi, ignora zeri iniziali e dati mancanti", () => {
    expect(gtinMismatch("4719331357542", "4719331357559")).toBe(true);
    expect(gtinMismatch("0730143314381", "730143314381")).toBe(false);
    expect(gtinMismatch(null, "4719331357542")).toBe(false);
    expect(gtinMismatch("4719331357542", undefined)).toBe(false);
  });
});
