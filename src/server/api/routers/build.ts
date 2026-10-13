import { z } from "zod";

import {
  caseSpecs,
  checkCompatibility,
  coolerSpecs,
  cpuSpecs,
  gpuSpecs,
  memorySpecs,
  motherboardSpecs,
  psuSpecs,
  storageSpecs,
} from "~/lib/engine";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const buildInput = z.object({
  cpu: cpuSpecs.optional(),
  motherboard: motherboardSpecs.optional(),
  memory: z.array(memorySpecs).max(8).optional(),
  gpu: gpuSpecs.optional(),
  storage: z.array(storageSpecs).max(16).optional(),
  psu: psuSpecs.optional(),
  case: caseSpecs.optional(),
  cooler: coolerSpecs.optional(),
});

export const buildRouter = createTRPCRouter({
  check: publicProcedure
    .input(buildInput)
    .query(({ input }) => checkCompatibility(input)),
});
