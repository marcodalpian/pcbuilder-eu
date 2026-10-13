import type { Category, SpecsFor } from "../src/lib/engine/specs";

/**
 * Catalogo iniziale per sviluppo. Specifiche prese dalle schede dei produttori,
 * ma da ricontrollare prima del lancio: qui conta che siano realistiche e
 * coprano i casi dell'engine (AM5/LGA1700/LGA1851, DDR4/DDR5, ATX/mATX/ITX,
 * SFX, 12V-2x6 vs 8-pin). I prezzi arriveranno dallo scraper, non dal seed.
 *
 * TDP: per AMD il TDP dichiarato, per Intel la "Processor Base Power".
 */

type SeedComponent<C extends Category = Category> = {
  category: C;
  brand: string;
  model: string;
  specs: SpecsFor<C>;
};

const c = <C extends Category>(
  category: C,
  brand: string,
  model: string,
  specs: SpecsFor<C>,
): SeedComponent<C> => ({ category, brand, model, specs });

export const seedComponents: SeedComponent[] = [
  // --- CPU ---
  c("CPU", "AMD", "Ryzen 7 9800X3D", {
    socket: "AM5",
    cores: 8,
    threads: 16,
    tdpW: 120,
    memoryTypes: ["DDR5"],
    integratedGraphics: true,
    includesCooler: false,
  }),
  c("CPU", "AMD", "Ryzen 5 9600X", {
    socket: "AM5",
    cores: 6,
    threads: 12,
    tdpW: 65,
    memoryTypes: ["DDR5"],
    integratedGraphics: true,
    includesCooler: false,
  }),
  c("CPU", "AMD", "Ryzen 5 7600", {
    socket: "AM5",
    cores: 6,
    threads: 12,
    tdpW: 65,
    memoryTypes: ["DDR5"],
    integratedGraphics: true,
    includesCooler: true,
  }),
  c("CPU", "Intel", "Core Ultra 7 265K", {
    socket: "LGA1851",
    cores: 20,
    threads: 20,
    tdpW: 125,
    memoryTypes: ["DDR5"],
    integratedGraphics: true,
    includesCooler: false,
  }),
  c("CPU", "Intel", "Core i5-14400F", {
    socket: "LGA1700",
    cores: 10,
    threads: 16,
    tdpW: 65,
    memoryTypes: ["DDR4", "DDR5"],
    integratedGraphics: false,
    includesCooler: true,
  }),

  // --- Schede madri ---
  c("MOTHERBOARD", "MSI", "MAG B650 TOMAHAWK WIFI", {
    socket: "AM5",
    formFactor: "ATX",
    memoryType: "DDR5",
    memorySlots: 4,
    maxMemoryGb: 192,
    m2Slots: 3,
    sataPorts: 6,
  }),
  c("MOTHERBOARD", "ASUS", "TUF GAMING B650M-PLUS WIFI", {
    socket: "AM5",
    formFactor: "mATX",
    memoryType: "DDR5",
    memorySlots: 4,
    maxMemoryGb: 192,
    m2Slots: 2,
    sataPorts: 4,
  }),
  c("MOTHERBOARD", "MSI", "PRO Z890-P WIFI", {
    socket: "LGA1851",
    formFactor: "ATX",
    memoryType: "DDR5",
    memorySlots: 4,
    maxMemoryGb: 256,
    m2Slots: 4,
    sataPorts: 4,
  }),
  c("MOTHERBOARD", "Gigabyte", "B760M DS3H DDR4", {
    socket: "LGA1700",
    formFactor: "mATX",
    memoryType: "DDR4",
    memorySlots: 4,
    maxMemoryGb: 128,
    m2Slots: 2,
    sataPorts: 4,
  }),

  // --- Memoria ---
  c("MEMORY", "Corsair", "Vengeance DDR5 32GB (2x16GB) 6000 CL30", {
    type: "DDR5",
    modules: 2,
    moduleSizeGb: 16,
    speedMts: 6000,
  }),
  c("MEMORY", "G.Skill", "Flare X5 DDR5 64GB (2x32GB) 6000 CL30", {
    type: "DDR5",
    modules: 2,
    moduleSizeGb: 32,
    speedMts: 6000,
  }),
  c("MEMORY", "Kingston", "FURY Beast DDR4 32GB (2x16GB) 3200 CL16", {
    type: "DDR4",
    modules: 2,
    moduleSizeGb: 16,
    speedMts: 3200,
  }),

  // --- Schede video (Founders Edition / reference per avere misure univoche) ---
  c("GPU", "NVIDIA", "GeForce RTX 5080 Founders Edition", {
    chipset: "RTX 5080",
    vramGb: 16,
    boardPowerW: 360,
    lengthMm: 304,
    power: { pcie8pin: 0, pin12v2x6: 1 },
  }),
  c("GPU", "NVIDIA", "GeForce RTX 5070 Founders Edition", {
    chipset: "RTX 5070",
    vramGb: 12,
    boardPowerW: 250,
    lengthMm: 242,
    power: { pcie8pin: 0, pin12v2x6: 1 },
  }),
  c("GPU", "AMD", "Radeon RX 7800 XT", {
    chipset: "RX 7800 XT",
    vramGb: 16,
    boardPowerW: 263,
    lengthMm: 267,
    power: { pcie8pin: 2, pin12v2x6: 0 },
  }),
  c("GPU", "AMD", "Radeon RX 7600", {
    chipset: "RX 7600",
    vramGb: 8,
    boardPowerW: 165,
    lengthMm: 204,
    power: { pcie8pin: 1, pin12v2x6: 0 },
  }),

  // --- Archiviazione ---
  c("STORAGE", "Samsung", "990 PRO 2TB", {
    interface: "M.2",
    capacityGb: 2000,
  }),
  c("STORAGE", "WD", "Black SN850X 1TB", {
    interface: "M.2",
    capacityGb: 1000,
  }),
  c("STORAGE", "Crucial", "MX500 1TB", { interface: "SATA", capacityGb: 1000 }),

  // --- Alimentatori ---
  c("PSU", "Corsair", "RM850x (2024)", {
    wattage: 850,
    formFactor: "ATX",
    efficiency: "80+ Gold",
    connectors: { pcie8pin: 3, pin12v2x6: 1 },
  }),
  c("PSU", "be quiet!", "Pure Power 12 M 750W", {
    wattage: 750,
    formFactor: "ATX",
    efficiency: "80+ Gold",
    connectors: { pcie8pin: 2, pin12v2x6: 1 },
  }),
  c("PSU", "Seasonic", "FOCUS GX-650", {
    wattage: 650,
    formFactor: "ATX",
    efficiency: "80+ Gold",
    connectors: { pcie8pin: 4, pin12v2x6: 0 },
  }),
  c("PSU", "Corsair", "SF750", {
    wattage: 750,
    formFactor: "SFX",
    efficiency: "80+ Platinum",
    connectors: { pcie8pin: 4, pin12v2x6: 0 },
  }),

  // --- Case ---
  c("CASE", "Fractal Design", "North", {
    motherboardFormFactors: ["ATX", "mATX", "ITX"],
    psuFormFactors: ["ATX"],
    maxGpuLengthMm: 355,
    maxCpuCoolerHeightMm: 170,
    radiatorSizesMm: [240, 280, 360],
  }),
  c("CASE", "Lian Li", "LANCOOL 216", {
    motherboardFormFactors: ["E-ATX", "ATX", "mATX", "ITX"],
    psuFormFactors: ["ATX"],
    maxGpuLengthMm: 392,
    maxCpuCoolerHeightMm: 180,
    radiatorSizesMm: [240, 280, 360],
  }),
  c("CASE", "Cooler Master", "MasterBox NR200P", {
    motherboardFormFactors: ["ITX"],
    psuFormFactors: ["SFX", "SFX-L"],
    maxGpuLengthMm: 330,
    maxCpuCoolerHeightMm: 155,
    radiatorSizesMm: [240, 280],
  }),

  // --- Dissipatori ---
  c("COOLER", "Thermalright", "Peerless Assassin 120 SE", {
    type: "air",
    sockets: ["AM4", "AM5", "LGA1700", "LGA1851"],
    heightMm: 155,
  }),
  c("COOLER", "Noctua", "NH-D15 G2", {
    type: "air",
    sockets: ["AM4", "AM5", "LGA1700", "LGA1851"],
    heightMm: 168,
  }),
  c("COOLER", "Arctic", "Liquid Freezer III 360", {
    type: "aio",
    sockets: ["AM4", "AM5", "LGA1700", "LGA1851"],
    radiatorMm: 360,
  }),
];

export const seedRetailers = [
  {
    slug: "amazon-it",
    name: "Amazon.it",
    country: "IT",
    baseUrl: "https://www.amazon.it",
  },
  {
    slug: "drako",
    name: "Drako",
    country: "IT",
    baseUrl: "https://www.drako.it",
  },
  {
    slug: "next",
    name: "Next",
    country: "IT",
    baseUrl: "https://www.nexths.it",
  },
  {
    slug: "eprice",
    name: "ePRICE",
    country: "IT",
    baseUrl: "https://www.eprice.it",
  },
];
