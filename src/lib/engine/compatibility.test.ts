import { describe, expect, it } from "vitest";

import {
  checkCompatibility,
  estimatePower,
  introducedErrors,
  type BuildInput,
} from "./compatibility";
import { parseSpecs, type GpuSpecs, type PsuSpecs } from "./specs";

// Fixture plausibili (non dati reali di catalogo).
const am5Cpu = parseSpecs("CPU", {
  socket: "AM5",
  cores: 8,
  threads: 16,
  tdpW: 120,
  memoryTypes: ["DDR5"],
  integratedGraphics: true,
  includesCooler: false,
});

const goodBuild: BuildInput = {
  cpu: am5Cpu,
  motherboard: parseSpecs("MOTHERBOARD", {
    socket: "AM5",
    formFactor: "ATX",
    memoryType: "DDR5",
    memorySlots: 4,
    maxMemoryGb: 192,
    m2Slots: 2,
    sataPorts: 4,
  }),
  memory: [
    parseSpecs("MEMORY", {
      type: "DDR5",
      modules: 2,
      moduleSizeGb: 16,
      speedMts: 6000,
    }),
  ],
  gpu: parseSpecs("GPU", {
    chipset: "Test 70",
    vramGb: 12,
    boardPowerW: 250,
    lengthMm: 300,
    power: { pcie8pin: 0, pin12v2x6: 1 },
  }),
  storage: [parseSpecs("STORAGE", { interface: "M.2", capacityGb: 2000 })],
  psu: parseSpecs("PSU", {
    wattage: 750,
    formFactor: "ATX",
    connectors: { pcie8pin: 2, pin12v2x6: 1 },
  }),
  case: parseSpecs("CASE", {
    motherboardFormFactors: ["ATX", "mATX", "ITX"],
    psuFormFactors: ["ATX"],
    maxGpuLengthMm: 360,
    maxCpuCoolerHeightMm: 165,
    radiatorSizesMm: [240, 280, 360],
  }),
  cooler: parseSpecs("COOLER", {
    type: "air",
    sockets: ["AM4", "AM5"],
    heightMm: 155,
    tdpRatingW: 220,
  }),
};

const codes = (b: BuildInput) =>
  checkCompatibility(b).issues.map((i) => i.code);

describe("checkCompatibility", () => {
  it("accetta una build coerente e completa", () => {
    const r = checkCompatibility(goodBuild);
    expect(r.issues).toEqual([]);
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(true);
  });

  it("build vuota: nessun errore, mancano gli obbligatori", () => {
    const r = checkCompatibility({});
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.missing).toEqual([
      "CPU",
      "MOTHERBOARD",
      "MEMORY",
      "STORAGE",
      "PSU",
      "CASE",
    ]);
  });

  it("GPU e dissipatore obbligatori solo se la CPU non li include", () => {
    const noIgpu = { ...am5Cpu, integratedGraphics: false };
    expect(checkCompatibility({ cpu: noIgpu }).missing).toContain("GPU");
    expect(checkCompatibility({ cpu: am5Cpu }).missing).not.toContain("GPU");
    expect(checkCompatibility({ cpu: am5Cpu }).missing).toContain("COOLER");
    expect(
      checkCompatibility({ cpu: { ...am5Cpu, includesCooler: true } }).missing,
    ).not.toContain("COOLER");
  });

  it("socket CPU diverso dalla scheda madre", () => {
    expect(
      codes({ ...goodBuild, cpu: { ...am5Cpu, socket: "LGA1851" } }),
    ).toContain("cpu_socket_mismatch");
  });

  it("dissipatore che non supporta il socket", () => {
    const cooler = {
      type: "air" as const,
      sockets: ["LGA1700"],
      heightMm: 150,
    };
    expect(codes({ ...goodBuild, cooler })).toContain(
      "cooler_socket_unsupported",
    );
  });

  it("RAM DDR4 su piattaforma DDR5", () => {
    const memory = [
      { type: "DDR4" as const, modules: 2, moduleSizeGb: 16, speedMts: 3200 },
    ];
    const c = codes({ ...goodBuild, memory });
    expect(c).toContain("memory_type_mismatch");
    expect(c).toContain("memory_type_cpu_unsupported");
  });

  it("troppi moduli RAM e kit misti", () => {
    const kit = goodBuild.memory![0]!;
    const c = codes({ ...goodBuild, memory: [kit, kit, kit] });
    expect(c).toContain("memory_slots_exceeded");
    expect(c).toContain("memory_mixed_kits");
  });

  it("troppi SSD M.2", () => {
    const ssd = goodBuild.storage![0]!;
    expect(codes({ ...goodBuild, storage: [ssd, ssd, ssd] })).toContain(
      "m2_slots_exceeded",
    );
  });

  it("ingombri del case: GPU, dissipatore, radiatore, formati", () => {
    const gpu: GpuSpecs = { ...goodBuild.gpu!, lengthMm: 380 };
    expect(codes({ ...goodBuild, gpu })).toContain("case_gpu_too_long");
    expect(
      codes({
        ...goodBuild,
        cooler: { type: "air", sockets: ["AM5"], heightMm: 170 },
      }),
    ).toContain("case_cooler_too_tall");
    expect(
      codes({
        ...goodBuild,
        cooler: { type: "aio", sockets: ["AM5"], radiatorMm: 420 },
      }),
    ).toContain("case_radiator_unsupported");
    expect(
      codes({
        ...goodBuild,
        motherboard: { ...goodBuild.motherboard!, formFactor: "E-ATX" },
      }),
    ).toContain("case_motherboard_form_factor");
    expect(
      codes({ ...goodBuild, psu: { ...goodBuild.psu!, formFactor: "SFX" } }),
    ).toContain("case_psu_form_factor");
  });

  it("alimentatore insufficiente vs al limite", () => {
    // stima: 75 + 120 + 250 + 7 = 452W -> consigliati 600W
    expect(estimatePower(goodBuild)).toEqual({
      estimatedW: 452,
      recommendedPsuW: 600,
    });
    expect(
      codes({ ...goodBuild, psu: { ...goodBuild.psu!, wattage: 400 } }),
    ).toContain("psu_insufficient");
    expect(
      codes({ ...goodBuild, psu: { ...goodBuild.psu!, wattage: 550 } }),
    ).toContain("psu_low_headroom");
  });

  it("connettori GPU: adattatore 12V-2x6 ok come warning, 8-pin mancanti come errore", () => {
    const psuNo12v: PsuSpecs = {
      ...goodBuild.psu!,
      connectors: { pcie8pin: 2, pin12v2x6: 0 },
    };
    const r = checkCompatibility({ ...goodBuild, psu: psuNo12v });
    expect(r.issues.map((i) => i.code)).toEqual(["gpu_power_adapter_needed"]);
    expect(r.valid).toBe(true);

    const psuFew8pin: PsuSpecs = {
      ...goodBuild.psu!,
      connectors: { pcie8pin: 1, pin12v2x6: 0 },
    };
    expect(codes({ ...goodBuild, psu: psuFew8pin })).toContain(
      "gpu_power_connectors_missing",
    );

    const gpu8pin: GpuSpecs = {
      ...goodBuild.gpu!,
      power: { pcie8pin: 3, pin12v2x6: 0 },
    };
    expect(codes({ ...goodBuild, gpu: gpu8pin })).toContain(
      "gpu_power_connectors_missing",
    );
  });
});

describe("introducedErrors", () => {
  it("ignora errori già presenti e segnala solo quelli nuovi", () => {
    const broken: BuildInput = {
      ...goodBuild,
      cpu: { ...am5Cpu, socket: "LGA1851" },
    };
    // Una GPU che entra nel case non introduce nulla di nuovo.
    expect(introducedErrors(broken, { gpu: goodBuild.gpu })).toEqual([]);
    // Una troppo lunga sì.
    const long = introducedErrors(broken, {
      gpu: { ...goodBuild.gpu!, lengthMm: 400 },
    });
    expect(long.map((i) => i.code)).toEqual(["case_gpu_too_long"]);
  });
});
