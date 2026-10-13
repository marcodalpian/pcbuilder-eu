import type {
  CaseSpecs,
  Category,
  CoolerSpecs,
  CpuSpecs,
  GpuSpecs,
  MemorySpecs,
  MotherboardSpecs,
  PsuSpecs,
  StorageSpecs,
} from "./specs";

/** Build anche parziale: le regole scattano solo quando entrambe le parti ci sono. */
export type BuildInput = {
  cpu?: CpuSpecs;
  motherboard?: MotherboardSpecs;
  memory?: MemorySpecs[];
  gpu?: GpuSpecs;
  storage?: StorageSpecs[];
  psu?: PsuSpecs;
  case?: CaseSpecs;
  cooler?: CoolerSpecs;
};

export type Severity = "error" | "warning";

export type Issue = {
  /** Codice stabile, usabile per i18n e analytics. */
  code: string;
  severity: Severity;
  message: string;
  /** Categorie coinvolte, per evidenziarle nella UI. */
  components: Category[];
};

export type PowerEstimate = {
  /** Assorbimento stimato a pieno carico (W). */
  estimatedW: number;
  /** Wattaggio PSU consigliato: +30% di margine per picchi transitori, arrotondato a 50W. */
  recommendedPsuW: number;
};

export type CompatibilityResult = {
  /** true se non ci sono errori (i warning non bloccano). */
  valid: boolean;
  /** true se ci sono tutti i componenti obbligatori. */
  complete: boolean;
  missing: Category[];
  issues: Issue[];
  power: PowerEstimate;
};

// Scheda madre, RAM, ventole, USB: stima conservativa forfettaria.
const BASE_SYSTEM_W = 75;
const PER_DRIVE_W = 7;
const PSU_HEADROOM = 1.3;

const REQUIRED: Category[] = [
  "CPU",
  "MOTHERBOARD",
  "MEMORY",
  "STORAGE",
  "PSU",
  "CASE",
];

export function estimatePower(build: BuildInput): PowerEstimate {
  const drives = build.storage?.length ?? 0;
  const estimatedW =
    BASE_SYSTEM_W +
    (build.cpu?.tdpW ?? 0) +
    (build.gpu?.boardPowerW ?? 0) +
    drives * PER_DRIVE_W;
  const recommendedPsuW = Math.ceil((estimatedW * PSU_HEADROOM) / 50) * 50;
  return { estimatedW, recommendedPsuW };
}

function missingCategories(build: BuildInput): Category[] {
  const present: Record<Category, boolean> = {
    CPU: !!build.cpu,
    MOTHERBOARD: !!build.motherboard,
    MEMORY: !!build.memory?.length,
    GPU: !!build.gpu,
    STORAGE: !!build.storage?.length,
    PSU: !!build.psu,
    CASE: !!build.case,
    COOLER: !!build.cooler,
  };
  const missing = REQUIRED.filter((c) => !present[c]);
  // GPU e dissipatore sono obbligatori solo se la CPU non li include.
  if (!build.gpu && build.cpu && !build.cpu.integratedGraphics)
    missing.push("GPU");
  if (!build.cooler && build.cpu && !build.cpu.includesCooler)
    missing.push("COOLER");
  return missing;
}

type Rule = (build: BuildInput) => Issue | Issue[] | null;

const rules: Rule[] = [
  // --- CPU <-> scheda madre <-> dissipatore ---
  ({ cpu, motherboard }) =>
    cpu && motherboard && cpu.socket !== motherboard.socket
      ? {
          code: "cpu_socket_mismatch",
          severity: "error",
          message: `La CPU usa il socket ${cpu.socket}, la scheda madre ${motherboard.socket}.`,
          components: ["CPU", "MOTHERBOARD"],
        }
      : null,

  ({ cpu, cooler }) =>
    cpu && cooler && !cooler.sockets.includes(cpu.socket)
      ? {
          code: "cooler_socket_unsupported",
          severity: "error",
          message: `Il dissipatore non supporta il socket ${cpu.socket}.`,
          components: ["CPU", "COOLER"],
        }
      : null,

  ({ cpu, cooler }) =>
    cpu && cooler?.tdpRatingW && cooler.tdpRatingW < cpu.tdpW
      ? {
          code: "cooler_underrated",
          severity: "warning",
          message: `Il dissipatore è dichiarato per ${cooler.tdpRatingW}W, la CPU ha un TDP di ${cpu.tdpW}W: rischio throttling.`,
          components: ["CPU", "COOLER"],
        }
      : null,

  // --- Memoria ---
  ({ motherboard, memory }) =>
    motherboard && memory?.some((m) => m.type !== motherboard.memoryType)
      ? {
          code: "memory_type_mismatch",
          severity: "error",
          message: `La scheda madre supporta solo ${motherboard.memoryType}.`,
          components: ["MEMORY", "MOTHERBOARD"],
        }
      : null,

  ({ cpu, memory }) => {
    const unsupported = memory?.find(
      (m) => cpu && !cpu.memoryTypes.includes(m.type),
    );
    return cpu && unsupported
      ? {
          code: "memory_type_cpu_unsupported",
          severity: "error",
          message: `La CPU non supporta memoria ${unsupported.type}.`,
          components: ["MEMORY", "CPU"],
        }
      : null;
  },

  ({ motherboard, memory }) => {
    if (!motherboard || !memory?.length) return null;
    const issues: Issue[] = [];
    const modules = memory.reduce((n, m) => n + m.modules, 0);
    const totalGb = memory.reduce((n, m) => n + m.modules * m.moduleSizeGb, 0);
    if (modules > motherboard.memorySlots) {
      issues.push({
        code: "memory_slots_exceeded",
        severity: "error",
        message: `${modules} moduli RAM ma la scheda madre ha ${motherboard.memorySlots} slot.`,
        components: ["MEMORY", "MOTHERBOARD"],
      });
    }
    if (totalGb > motherboard.maxMemoryGb) {
      issues.push({
        code: "memory_capacity_exceeded",
        severity: "error",
        message: `${totalGb}GB di RAM superano il massimo supportato (${motherboard.maxMemoryGb}GB).`,
        components: ["MEMORY", "MOTHERBOARD"],
      });
    }
    if (memory.length > 1) {
      issues.push({
        code: "memory_mixed_kits",
        severity: "warning",
        message:
          "Kit RAM diversi possono non funzionare insieme alla velocità dichiarata: meglio un kit unico.",
        components: ["MEMORY"],
      });
    }
    return issues;
  },

  // --- Archiviazione ---
  ({ motherboard, storage }) => {
    if (!motherboard || !storage?.length) return null;
    const issues: Issue[] = [];
    const m2 = storage.filter((s) => s.interface === "M.2").length;
    const sata = storage.filter((s) => s.interface === "SATA").length;
    if (m2 > motherboard.m2Slots) {
      issues.push({
        code: "m2_slots_exceeded",
        severity: "error",
        message: `${m2} SSD M.2 ma la scheda madre ha ${motherboard.m2Slots} slot M.2.`,
        components: ["STORAGE", "MOTHERBOARD"],
      });
    }
    if (sata > motherboard.sataPorts) {
      issues.push({
        code: "sata_ports_exceeded",
        severity: "error",
        message: `${sata} dischi SATA ma la scheda madre ha ${motherboard.sataPorts} porte SATA.`,
        components: ["STORAGE", "MOTHERBOARD"],
      });
    }
    return issues;
  },

  // --- Case: ingombri e formati ---
  ({ motherboard, case: pcCase }) =>
    motherboard &&
    pcCase &&
    !pcCase.motherboardFormFactors.includes(motherboard.formFactor)
      ? {
          code: "case_motherboard_form_factor",
          severity: "error",
          message: `Il case non supporta schede madri ${motherboard.formFactor}.`,
          components: ["CASE", "MOTHERBOARD"],
        }
      : null,

  ({ gpu, case: pcCase }) =>
    gpu && pcCase && gpu.lengthMm > pcCase.maxGpuLengthMm
      ? {
          code: "case_gpu_too_long",
          severity: "error",
          message: `La GPU è lunga ${gpu.lengthMm}mm, il case ne accetta al massimo ${pcCase.maxGpuLengthMm}mm.`,
          components: ["CASE", "GPU"],
        }
      : null,

  ({ cooler, case: pcCase }) => {
    if (!cooler || !pcCase) return null;
    if (
      cooler.type === "air" &&
      cooler.heightMm > pcCase.maxCpuCoolerHeightMm
    ) {
      return {
        code: "case_cooler_too_tall",
        severity: "error",
        message: `Il dissipatore è alto ${cooler.heightMm}mm, il case ne accetta al massimo ${pcCase.maxCpuCoolerHeightMm}mm.`,
        components: ["CASE", "COOLER"],
      };
    }
    if (
      cooler.type === "aio" &&
      !pcCase.radiatorSizesMm.includes(cooler.radiatorMm)
    ) {
      return {
        code: "case_radiator_unsupported",
        severity: "error",
        message: `Il case non supporta radiatori da ${cooler.radiatorMm}mm.`,
        components: ["CASE", "COOLER"],
      };
    }
    return null;
  },

  ({ psu, case: pcCase }) =>
    psu && pcCase && !pcCase.psuFormFactors.includes(psu.formFactor)
      ? {
          code: "case_psu_form_factor",
          severity: "error",
          message: `Il case non supporta alimentatori ${psu.formFactor}.`,
          components: ["CASE", "PSU"],
        }
      : null,

  // --- Alimentazione ---
  (build) => {
    const { psu } = build;
    if (!psu || (!build.cpu && !build.gpu)) return null;
    const { estimatedW, recommendedPsuW } = estimatePower(build);
    if (psu.wattage < estimatedW) {
      return {
        code: "psu_insufficient",
        severity: "error",
        message: `Consumo stimato ${estimatedW}W, l'alimentatore ne eroga ${psu.wattage}W.`,
        components: ["PSU"],
      };
    }
    if (psu.wattage < recommendedPsuW) {
      return {
        code: "psu_low_headroom",
        severity: "warning",
        message: `Alimentatore al limite: consigliati almeno ${recommendedPsuW}W per gestire i picchi.`,
        components: ["PSU"],
      };
    }
    return null;
  },

  ({ gpu, psu }) => {
    if (!gpu || !psu) return null;
    if (gpu.power.pin12v2x6 > psu.connectors.pin12v2x6) {
      // Le GPU con 12V-2x6 includono quasi sempre un adattatore da più 8-pin
      // (150W ciascuno da specifica PCIe).
      const eightPinViaAdapter = Math.ceil(gpu.boardPowerW / 150);
      const enough =
        psu.connectors.pcie8pin >= gpu.power.pcie8pin + eightPinViaAdapter;
      return {
        code: enough
          ? "gpu_power_adapter_needed"
          : "gpu_power_connectors_missing",
        severity: enough ? "warning" : "error",
        message: enough
          ? "L'alimentatore non ha il connettore 12V-2x6: servirà l'adattatore incluso con la GPU."
          : "L'alimentatore non ha abbastanza connettori PCIe per alimentare la GPU.",
        components: ["GPU", "PSU"],
      };
    }
    return gpu.power.pcie8pin > psu.connectors.pcie8pin
      ? {
          code: "gpu_power_connectors_missing",
          severity: "error",
          message: `La GPU richiede ${gpu.power.pcie8pin} connettori PCIe 8-pin, l'alimentatore ne ha ${psu.connectors.pcie8pin}.`,
          components: ["GPU", "PSU"],
        }
      : null;
  },
];

export function checkCompatibility(build: BuildInput): CompatibilityResult {
  const issues = rules.flatMap((rule) => {
    const out = rule(build);
    return out === null ? [] : Array.isArray(out) ? out : [out];
  });
  const missing = missingCategories(build);
  return {
    valid: !issues.some((i) => i.severity === "error"),
    complete: missing.length === 0,
    missing,
    issues,
    power: estimatePower(build),
  };
}

const issueKey = (i: Issue) => `${i.code}|${i.message}`;

/**
 * Errori che una modifica introdurrebbe rispetto alla build attuale.
 * Serve al picker per filtrare/marcare i candidati: un componente è
 * compatibile se `introducedErrors(build, { gpu: candidato })` è vuoto,
 * anche quando la build ha già altri problemi non legati a lui.
 */
export function introducedErrors(
  build: BuildInput,
  patch: Partial<BuildInput>,
): Issue[] {
  const before = new Set(checkCompatibility(build).issues.map(issueKey));
  return checkCompatibility({ ...build, ...patch }).issues.filter(
    (i) => i.severity === "error" && !before.has(issueKey(i)),
  );
}
