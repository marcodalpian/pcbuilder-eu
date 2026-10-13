import {
  Box,
  CircuitBoard,
  Cpu,
  Fan,
  HardDrive,
  MemoryStick,
  Monitor,
  PlugZap,
  type LucideIcon,
} from "lucide-react";

import type { Category } from "~/lib/engine";

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  CPU: Cpu,
  COOLER: Fan,
  MOTHERBOARD: CircuitBoard,
  MEMORY: MemoryStick,
  GPU: Monitor,
  STORAGE: HardDrive,
  PSU: PlugZap,
  CASE: Box,
};

const base =
  "press inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

export const button = {
  primary: `${base} bg-accent text-accent-ink hover:bg-accent-strong`,
  secondary: `${base} border border-line-strong text-fg hover:bg-raised`,
  ghost: `${base} text-muted hover:bg-raised hover:text-fg`,
  icon: "press inline-grid size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg",
};
