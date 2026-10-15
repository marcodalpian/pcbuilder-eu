import type { OfferLink } from "../src/server/prices/refresh";

/**
 * Link curati a mano: componente del catalogo → pagina prodotto nel negozio.
 * Solo prodotti identici a quelli del catalogo (stessa versione, stesso kit):
 * un link a una variante mostrerebbe il prezzo di un prodotto diverso.
 *
 * Fonti autorizzate: vedi SCRAPING_SOURCES in scripts/refresh-prices.ts.
 */
export const offerLinks: OfferLink[] = [
  // --- CPU ---
  {
    component: "amd-ryzen-7-9800x3d",
    retailer: "alternate",
    url: "https://www.alternate.it/AMD/Ryzen-7-9800X3D-Processore/html/product/100093605",
  },
  {
    component: "amd-ryzen-5-9600x",
    retailer: "alternate",
    url: "https://www.alternate.it/AMD/Ryzen-5-9600X-Processore/html/product/100065801",
  },
  {
    component: "amd-ryzen-5-7600",
    retailer: "alternate",
    url: "https://www.alternate.it/AMD/Ryzen-5-7600-Processore/html/product/1883673",
  },
  {
    // Alternate vende solo la versione tray: stesso chip, senza dissipatore come la boxed.
    component: "intel-core-ultra-7-265k",
    retailer: "alternate",
    url: "https://www.alternate.it/Intel/Core-Ultra-7-265K-Processore/html/product/100077065",
  },
  {
    // Versione boxed: include il dissipatore, come da catalogo.
    component: "intel-core-i5-14400f",
    retailer: "alternate",
    url: "https://www.alternate.it/Intel/Core-i5-14400F-Processore/html/product/100029721",
  },

  // --- Schede madri ---
  {
    component: "asus-tuf-gaming-b650m-plus-wifi",
    retailer: "alternate",
    url: "https://www.alternate.it/ASUS/TUF-GAMING-B650M-PLUS-WIFI-AMD-B650-Socket-AM5-micro-ATX-Scheda-madre/html/product/1870287",
  },
  {
    component: "gigabyte-b760m-ds3h-ddr4",
    retailer: "alternate",
    url: "https://www.alternate.it/GIGABYTE/B760M-DS3H-DDR4-Scheda-Madre-Supporta-CPU-Intel-Core-di-14a-Generazione-VRM-Digitale-6plus2plus1-Fasi-fino-a-5333MHz-DDR4-OC-2xPCIe-4-0-M-2-LAN-2-5GbE-USB-3-2-Gen2/html/product/1887018",
  },

  // --- Archiviazione ---
  {
    component: "wd-black-sn850x-1tb",
    retailer: "alternate",
    url: "https://www.alternate.it/WD/Black-SN850X-NVMe-SSD-1-TB-Disco-a-stato-solido/html/product/1862683",
  },

  // --- Alimentatori ---
  {
    component: "corsair-rm850x-2024",
    retailer: "alternate",
    url: "https://www.alternate.it/Corsair/RM850x-2024-Alimentatore-PC/html/product/100069063",
  },
  {
    component: "corsair-sf750",
    retailer: "alternate",
    url: "https://www.alternate.it/Corsair/SF750-Alimentatore-PC/html/product/100061550",
  },

  // --- Dissipatori ---
  {
    component: "noctua-nh-d15-g2",
    retailer: "alternate",
    url: "https://www.alternate.it/Noctua/NH-D15-G2-raffreddamento-CPU/html/product/100067139",
  },
];
