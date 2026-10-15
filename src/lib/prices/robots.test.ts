import { describe, expect, it } from "vitest";

import { parseRobots } from "./robots";

const UA =
  "PCBuilderEU-bot/0.1 (+https://github.com/marcodalpian/pcbuilder-eu)";

describe("parseRobots", () => {
  // Estratto della forma del robots.txt di Alternate.
  const alternate = `# access allowed
User-agent: *
Allow: /llms.txt
Disallow: *.pdf
Disallow: *.json
Disallow: /rest/
Disallow: /productShareModal.xhtml
`;

  it("pagine prodotto permesse, API e json vietati", () => {
    const r = parseRobots(alternate, UA);
    expect(
      r.isAllowed("/AMD/Ryzen-5-7600-Processore/html/product/1883673"),
    ).toBe(true);
    expect(r.isAllowed("/rest/product/123")).toBe(false);
    expect(r.isAllowed("/data/feed.json")).toBe(false);
    expect(r.isAllowed("/manuale.pdf")).toBe(false);
    expect(r.isAllowed("/llms.txt")).toBe(true);
  });

  it("Disallow: / blocca tutto (es. Next)", () => {
    const r = parseRobots("User-agent: *\nDisallow: /\nCrawl-delay: 10", UA);
    expect(r.isAllowed("/qualsiasi/pagina")).toBe(false);
  });

  it("un gruppo specifico per il nostro bot vince su *", () => {
    const txt = `User-agent: *
Disallow: /

User-agent: pcbuildereu-bot
Disallow: /privato/
`;
    const r = parseRobots(txt, UA);
    expect(r.isAllowed("/prodotto/1")).toBe(true);
    expect(r.isAllowed("/privato/x")).toBe(false);
  });

  it("regola più lunga vince, a parità Allow; $ ancora la fine", () => {
    const txt = `User-agent: *
Disallow: /shop/
Allow: /shop/product/
Disallow: /*.php$
`;
    const r = parseRobots(txt, UA);
    expect(r.isAllowed("/shop/cart")).toBe(false);
    expect(r.isAllowed("/shop/product/1")).toBe(true);
    expect(r.isAllowed("/index.php")).toBe(false);
    expect(r.isAllowed("/index.php?x=1")).toBe(true);
  });

  it("più User-agent consecutivi condividono il gruppo; Disallow vuoto non vieta", () => {
    const txt = `User-agent: SemrushBot
User-agent: AhrefsBot
Disallow: /

User-agent: *
Disallow:
`;
    const r = parseRobots(txt, UA);
    expect(r.isAllowed("/qualsiasi")).toBe(true);
    expect(parseRobots(txt, "AhrefsBot/7.0").isAllowed("/x")).toBe(false);
  });
});
