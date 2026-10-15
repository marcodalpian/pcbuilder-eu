/**
 * Aggiorna prezzi e disponibilità leggendo le pagine prodotto dei link curati
 * (prisma/offer-links.ts). Uso: npm run prices:refresh
 */
import { PrismaClient } from "../generated/prisma";
import { offerLinks } from "../prisma/offer-links";
import { createPoliteFetcher } from "../src/server/prices/polite-fetch";
import { refreshOffers } from "../src/server/prices/refresh";

/**
 * Negozi da cui leggiamo le pagine, con il motivo per cui è lecito.
 * Prima di aggiungerne uno: leggere termini d'uso e robots.txt.
 *
 * - Alternate: termini e note legali non menzionano accesso automatizzato o
 *   riuso dei prezzi; robots.txt permette le pagine prodotto (verificato
 *   2026-10-16). Esclusi: Amazon, Drako, PcComponentes (vietato dai termini),
 *   ePRICE (blocco anti-bot), Next (robots.txt vieta tutto).
 */
const SCRAPING_SOURCES: Record<string, string> = {
  alternate: "www.alternate.it",
};

async function main() {
  const links = offerLinks.filter((l) => l.retailer in SCRAPING_SOURCES);
  const skipped = offerLinks.length - links.length;
  console.log(
    `Controllo ${links.length} pagine${skipped ? ` (${skipped} link di fonti non autorizzate saltati)` : ""}, una ogni 5 secondi…`,
  );

  const db = new PrismaClient();
  try {
    const report = await refreshOffers(
      db,
      links,
      createPoliteFetcher({ allowedHosts: Object.values(SCRAPING_SOURCES) }),
    );
    console.log(
      `Fatto: ${report.updated} offerte nuove o cambiate, ${report.unchanged} invariate, ${report.failed.length} errori.`,
    );
    for (const f of report.failed) console.log(`  ✗ ${f.url}\n    ${f.error}`);
    for (const w of report.warnings) console.log(`  ! ${w}`);
    if (report.failed.length) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
