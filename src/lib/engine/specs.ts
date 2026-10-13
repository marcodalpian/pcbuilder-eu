import { z } from "zod";

/**
 * Specifiche tecniche per categoria. Nel DB vivono in `Component.specs` (Json);
 * questi schemi sono la fonte di verità e vanno usati per validarle in lettura
 * e in scrittura (scraper, seed, admin).
 */

export const memoryType = z.enum(["DDR4", "DDR5"]);
export const moboFormFactor = z.enum(["E-ATX", "ATX", "mATX", "ITX"]);
export const psuFormFactor = z.enum(["ATX", "SFX", "SFX-L"]);

export const cpuSpecs = z.object({
  socket: z.string(), // es. "AM5", "LGA1851"
  cores: z.number().int().positive(),
  threads: z.number().int().positive(),
  tdpW: z.number().positive(),
  memoryTypes: z.array(memoryType).min(1),
  integratedGraphics: z.boolean(),
  includesCooler: z.boolean(),
});

export const motherboardSpecs = z.object({
  socket: z.string(),
  formFactor: moboFormFactor,
  memoryType: memoryType,
  memorySlots: z.number().int().positive(),
  maxMemoryGb: z.number().positive(),
  m2Slots: z.number().int().nonnegative(),
  sataPorts: z.number().int().nonnegative(),
});

export const memorySpecs = z.object({
  type: memoryType,
  modules: z.number().int().positive(), // moduli nel kit (es. 2 per 2x16GB)
  moduleSizeGb: z.number().positive(),
  speedMts: z.number().int().positive(),
});

export const gpuSpecs = z.object({
  chipset: z.string(), // es. "RTX 5070"
  vramGb: z.number().positive(),
  boardPowerW: z.number().positive(),
  lengthMm: z.number().positive(),
  power: z.object({
    pcie8pin: z.number().int().nonnegative(),
    pin12v2x6: z.number().int().nonnegative(), // 12V-2x6 / 12VHPWR
  }),
});

export const storageSpecs = z.object({
  interface: z.enum(["M.2", "SATA"]),
  capacityGb: z.number().positive(),
});

export const psuSpecs = z.object({
  wattage: z.number().positive(),
  formFactor: psuFormFactor,
  efficiency: z.string().optional(), // es. "80+ Gold"
  connectors: z.object({
    pcie8pin: z.number().int().nonnegative(),
    pin12v2x6: z.number().int().nonnegative(),
  }),
});

export const caseSpecs = z.object({
  motherboardFormFactors: z.array(moboFormFactor).min(1),
  psuFormFactors: z.array(psuFormFactor).min(1),
  maxGpuLengthMm: z.number().positive(),
  maxCpuCoolerHeightMm: z.number().positive(),
  radiatorSizesMm: z.array(z.number().int().positive()), // es. [240, 280, 360]
});

export const coolerSpecs = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("air"),
    sockets: z.array(z.string()).min(1),
    heightMm: z.number().positive(),
    tdpRatingW: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal("aio"),
    sockets: z.array(z.string()).min(1),
    radiatorMm: z.number().int().positive(),
    tdpRatingW: z.number().positive().optional(),
  }),
]);

export const specsByCategory = {
  CPU: cpuSpecs,
  MOTHERBOARD: motherboardSpecs,
  MEMORY: memorySpecs,
  GPU: gpuSpecs,
  STORAGE: storageSpecs,
  PSU: psuSpecs,
  CASE: caseSpecs,
  COOLER: coolerSpecs,
} as const;

export type Category = keyof typeof specsByCategory;
export const categories = Object.keys(specsByCategory) as Category[];

export type CpuSpecs = z.infer<typeof cpuSpecs>;
export type MotherboardSpecs = z.infer<typeof motherboardSpecs>;
export type MemorySpecs = z.infer<typeof memorySpecs>;
export type GpuSpecs = z.infer<typeof gpuSpecs>;
export type StorageSpecs = z.infer<typeof storageSpecs>;
export type PsuSpecs = z.infer<typeof psuSpecs>;
export type CaseSpecs = z.infer<typeof caseSpecs>;
export type CoolerSpecs = z.infer<typeof coolerSpecs>;

export type SpecsFor<C extends Category> = z.infer<(typeof specsByCategory)[C]>;

/** Valida il Json grezzo di `Component.specs` per la categoria data. */
export function parseSpecs<C extends Category>(
  category: C,
  raw: unknown,
): SpecsFor<C> {
  return specsByCategory[category].parse(raw);
}
