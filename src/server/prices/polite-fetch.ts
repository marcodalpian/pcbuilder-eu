import { parseRobots, type Robots } from "~/lib/prices/robots";
import type { FetchPage } from "./refresh";

export const USER_AGENT =
  "PCBuilderEU-bot/0.1 (+https://github.com/marcodalpian/pcbuilder-eu)";

/**
 * Fetcher "cortese": solo host autorizzati, rispetta robots.txt, una richiesta
 * alla volta con pausa minima per host, si ferma al primo segnale di blocco
 * (403/429/503) senza tentare di aggirarlo.
 */
export function createPoliteFetcher({
  allowedHosts,
  minDelayMs = 5000,
  timeoutMs = 20000,
}: {
  /** Host per cui abbiamo verificato termini d'uso e robots.txt. */
  allowedHosts: string[];
  minDelayMs?: number;
  timeoutMs?: number;
}): FetchPage {
  const robotsByHost = new Map<string, Robots>();
  const lastRequestAt = new Map<string, number>();
  const blockedHosts = new Map<string, string>();

  const request = async (url: URL) => {
    const wait = (lastRequestAt.get(url.host) ?? 0) + minDelayMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt.set(url.host, Date.now());
    return fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
  };

  const robotsFor = async (url: URL): Promise<Robots> => {
    const cached = robotsByHost.get(url.host);
    if (cached) return cached;
    let robots: Robots;
    try {
      const res = await request(new URL("/robots.txt", url));
      if (res.ok) {
        robots = parseRobots(await res.text(), USER_AGENT);
      } else if (res.status >= 400 && res.status < 500) {
        // RFC 9309: robots.txt assente (4xx) = nessuna restrizione.
        robots = { isAllowed: () => true };
      } else {
        // Server in errore: nel dubbio non tocchiamo nulla.
        robots = { isAllowed: () => false };
      }
    } catch {
      robots = { isAllowed: () => false };
    }
    robotsByHost.set(url.host, robots);
    return robots;
  };

  return async (rawUrl) => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { ok: false, error: `URL non valido: ${rawUrl}` };
    }
    if (!allowedHosts.includes(url.host)) {
      return {
        ok: false,
        error: `${url.host} non è tra le fonti autorizzate allo scraping.`,
      };
    }
    const blocked = blockedHosts.get(url.host);
    if (blocked) return { ok: false, error: blocked };

    if (!(await robotsFor(url)).isAllowed(url.pathname + url.search)) {
      return { ok: false, error: "Vietato dal robots.txt del negozio." };
    }

    try {
      const res = await request(url);
      if (res.ok) return { ok: true, html: await res.text() };
      if (res.status === 404 || res.status === 410) {
        return {
          ok: false,
          gone: true,
          error: `Pagina rimossa (${res.status}).`,
        };
      }
      if ([403, 429, 503].includes(res.status)) {
        const error = `${url.host} ha risposto ${res.status}: ci fermiamo per questo giro.`;
        blockedHosts.set(url.host, error);
        return { ok: false, error };
      }
      return { ok: false, error: `Risposta inattesa: ${res.status}.` };
    } catch (e) {
      return {
        ok: false,
        error: `Rete: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  };
}
