import type { BuildInput, Category, SpecsFor } from "~/lib/engine";

/** Offerta disponibile in un negozio, già filtrata: solo prodotti in vendita. */
export type CatalogOffer = {
  retailer: string; // nome visualizzato
  url: string;
  /** IVA inclusa, spedizione esclusa. */
  priceCents: number;
  /** ISO 8601: quando abbiamo letto il prezzo l'ultima volta. */
  checkedAt: string;
};

/** Componente del catalogo con specifiche già validate, tipizzate per categoria. */
export type CatalogItem = {
  [C in Category]: {
    id: string;
    slug: string;
    category: C;
    brand: string;
    model: string;
    specs: SpecsFor<C>;
    /** Dal prezzo più basso al più alto. Vuoto solo in sviluppo (SHOW_UNAVAILABLE_PARTS). */
    offers: CatalogOffer[];
  };
}[Category];

export const bestOffer = (item: CatalogItem): CatalogOffer | undefined =>
  item.offers[0];

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
export const formatPrice = (cents: number) => euro.format(cents / 100);

/** Slot della build nell'ordine in cui li mostra la UI. */
export const SLOTS = [
  "CPU",
  "COOLER",
  "MOTHERBOARD",
  "MEMORY",
  "GPU",
  "STORAGE",
  "PSU",
  "CASE",
] as const satisfies readonly Category[];

export const CATEGORY_LABEL: Record<Category, string> = {
  CPU: "Processore",
  COOLER: "Dissipatore",
  MOTHERBOARD: "Scheda madre",
  MEMORY: "Memoria RAM",
  GPU: "Scheda video",
  STORAGE: "Archiviazione",
  PSU: "Alimentatore",
  CASE: "Case",
};

/** Etichetta dentro una frase ("Cambia memoria RAM"): abbassa solo l'iniziale, non le sigle. */
export const categoryNoun = (c: Category) => {
  const label = CATEGORY_LABEL[c];
  return label.charAt(0).toLowerCase() + label.slice(1);
};

/** Selezione dell'utente: slug per slot, più dischi per l'archiviazione. */
export type Selection = Partial<
  Record<Exclude<Category, "STORAGE">, string>
> & {
  STORAGE: string[];
};

export const emptySelection = (): Selection => ({ STORAGE: [] });

const PARAM: Record<Category, string> = {
  CPU: "cpu",
  COOLER: "cooler",
  MOTHERBOARD: "mobo",
  MEMORY: "ram",
  GPU: "gpu",
  STORAGE: "ssd",
  PSU: "psu",
  CASE: "case",
};

/** La build vive nell'URL, così ogni configurazione è un link condivisibile. */
export function selectionToParams(sel: Selection): URLSearchParams {
  const params = new URLSearchParams();
  for (const cat of SLOTS) {
    if (cat === "STORAGE") {
      if (sel.STORAGE.length) params.set(PARAM.STORAGE, sel.STORAGE.join(","));
    } else if (sel[cat]) {
      params.set(PARAM[cat], sel[cat]);
    }
  }
  return params;
}

export function selectionFromParams(
  params: Record<string, string | string[] | undefined>,
  bySlug: Map<string, CatalogItem>,
): Selection {
  const sel = emptySelection();
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  // Scarta slug sconosciuti o di categoria sbagliata (link vecchi o manomessi).
  const valid = (slug: string | undefined, cat: Category) =>
    slug && bySlug.get(slug)?.category === cat ? slug : undefined;

  for (const cat of SLOTS) {
    const raw = first(params[PARAM[cat]]);
    if (cat === "STORAGE") {
      sel.STORAGE = (raw?.split(",") ?? [])
        .map((s) => valid(s, "STORAGE"))
        .filter((s): s is string => !!s)
        .slice(0, 8);
    } else {
      sel[cat] = valid(raw, cat);
    }
  }
  return sel;
}

export function toBuildInput(
  sel: Selection,
  bySlug: Map<string, CatalogItem>,
): BuildInput {
  const get = <C extends Category>(
    cat: C,
    slug: string | undefined,
  ): SpecsFor<C> | undefined => {
    const item = slug ? bySlug.get(slug) : undefined;
    return item?.category === cat ? item.specs : undefined;
  };
  const memory = get("MEMORY", sel.MEMORY);
  return {
    cpu: get("CPU", sel.CPU),
    cooler: get("COOLER", sel.COOLER),
    motherboard: get("MOTHERBOARD", sel.MOTHERBOARD),
    memory: memory ? [memory] : undefined,
    gpu: get("GPU", sel.GPU),
    storage: sel.STORAGE.map((s) => get("STORAGE", s)).filter(
      (s): s is SpecsFor<"STORAGE"> => !!s,
    ),
    psu: get("PSU", sel.PSU),
    case: get("CASE", sel.CASE),
  };
}

const formatCapacity = (gb: number) =>
  gb >= 1000 ? `${gb / 1000} TB` : `${gb} GB`;

/** Riga di specifiche chiave mostrata sotto il nome. */
export function specLine(item: CatalogItem): string {
  switch (item.category) {
    case "CPU": {
      const s = item.specs;
      return [
        s.socket,
        `${s.cores}C/${s.threads}T`,
        `${s.tdpW} W`,
        s.includesCooler && "dissipatore incluso",
      ]
        .filter(Boolean)
        .join(" · ");
    }
    case "COOLER":
      return item.specs.type === "air"
        ? `Ad aria · ${item.specs.heightMm} mm`
        : `Liquido AIO · ${item.specs.radiatorMm} mm`;
    case "MOTHERBOARD": {
      const s = item.specs;
      return `${s.socket} · ${s.formFactor} · ${s.memoryType} · ${s.m2Slots}× M.2`;
    }
    case "MEMORY": {
      const s = item.specs;
      return `${s.type}-${s.speedMts} · ${s.modules}×${s.moduleSizeGb} GB`;
    }
    case "GPU": {
      const s = item.specs;
      return `${s.vramGb} GB · ${s.boardPowerW} W · ${s.lengthMm} mm`;
    }
    case "STORAGE":
      return `${item.specs.interface} · ${formatCapacity(item.specs.capacityGb)}`;
    case "PSU": {
      const s = item.specs;
      return [
        `${s.wattage} W`,
        s.formFactor,
        s.efficiency,
        s.connectors.pin12v2x6 > 0 && "12V-2x6",
      ]
        .filter(Boolean)
        .join(" · ");
    }
    case "CASE": {
      const s = item.specs;
      return `${s.motherboardFormFactors.join("/")} · GPU ≤ ${s.maxGpuLengthMm} mm · dissipatore ≤ ${s.maxCpuCoolerHeightMm} mm`;
    }
  }
}
