import { describe, expect, it } from "vitest";

import { checkCompatibility } from "../src/lib/engine/compatibility";
import { categories, parseSpecs, type Category } from "../src/lib/engine/specs";
import { offerLinks } from "./offer-links";
import { componentSlug, seedComponents, seedRetailers } from "./seed-data";

describe("offer-links", () => {
  it("ogni link punta a un componente e a un negozio del seed", () => {
    const slugs = new Set(seedComponents.map(componentSlug));
    const retailers = new Set(seedRetailers.map((r) => r.slug));
    for (const link of offerLinks) {
      expect(slugs, link.url).toContain(link.component);
      expect(retailers, link.url).toContain(link.retailer);
    }
  });

  it("al massimo un link per componente e negozio", () => {
    const keys = offerLinks.map((l) => `${l.component}|${l.retailer}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("seed-data", () => {
  it("ogni componente rispetta lo schema della sua categoria", () => {
    for (const comp of seedComponents) {
      expect(
        () => parseSpecs(comp.category, comp.specs),
        `${comp.brand} ${comp.model}`,
      ).not.toThrow();
    }
  });

  it("copre tutte le categorie", () => {
    const present = new Set(seedComponents.map((c) => c.category));
    expect([...present].sort()).toEqual([...categories].sort());
  });

  it("scenario reale: RTX 5090 Astral e scheda ATX nel NR200P → entrambi gli errori", () => {
    const specs = <C extends Category>(category: C, model: string) => {
      const comp = seedComponents.find(
        (c) => c.category === category && c.model === model,
      );
      if (!comp) throw new Error(`Manca nel seed: ${model}`);
      return parseSpecs(category, comp.specs);
    };
    const gpu = specs("GPU", "ROG Astral GeForce RTX 5090 OC");
    const motherboard = specs("MOTHERBOARD", "MAG B650 TOMAHAWK WIFI");

    const inNr200p = checkCompatibility({
      gpu,
      motherboard,
      case: specs("CASE", "MasterBox NR200P"),
    }).issues.map((i) => i.code);
    expect(inNr200p).toContain("case_gpu_too_long");
    expect(inNr200p).toContain("case_motherboard_form_factor");

    // Nel North la scheda madre ATX entra, la GPU (358 mm > 355) no.
    const inNorth = checkCompatibility({
      gpu,
      motherboard,
      case: specs("CASE", "North"),
    }).issues.map((i) => i.code);
    expect(inNorth).toEqual(["case_gpu_too_long"]);
  });

  it("niente duplicati brand+modello", () => {
    const keys = seedComponents.map((c) => `${c.brand}|${c.model}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
