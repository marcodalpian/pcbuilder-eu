import { describe, expect, it } from "vitest";

import { categories, parseSpecs } from "../src/lib/engine/specs";
import { seedComponents } from "./seed-data";

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

  it("niente duplicati brand+modello", () => {
    const keys = seedComponents.map((c) => `${c.brand}|${c.model}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
