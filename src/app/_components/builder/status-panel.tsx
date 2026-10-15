"use client";

import {
  Check,
  CircleCheck,
  CircleX,
  Link2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  bestOffer,
  CATEGORY_LABEL,
  categoryNoun,
  formatPrice,
  SLOTS,
  type CatalogItem,
} from "~/lib/catalog";
import type { Category, CompatibilityResult } from "~/lib/engine";
import { button } from "./ui";

export function StatusPanel({
  result,
  selectedItems,
  isEmpty,
  hasCpuOrGpu,
  psuWattage,
  canUndo,
  onFix,
  onReset,
  onUndo,
}: {
  result: CompatibilityResult;
  selectedItems: CatalogItem[];
  isEmpty: boolean;
  hasCpuOrGpu: boolean;
  psuWattage: number | null;
  canUndo: boolean;
  onFix: (category: Category) => void;
  onReset: () => void;
  onUndo: () => void;
}) {
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  const missing = SLOTS.filter((c) => result.missing.includes(c)).map(
    (c) => CATEGORY_LABEL[c],
  );

  return (
    <div className="border-line bg-panel rounded-lg border">
      <section className="p-5" aria-live="polite">
        {isEmpty ? (
          <>
            <h2 className="text-base font-semibold">Inizia dal processore</h2>
            <p className="text-muted mt-1.5 text-sm">
              Socket e tipo di memoria della CPU decidono quali schede madri e
              RAM sono compatibili: da lì filtriamo il resto.
            </p>
          </>
        ) : (
          <>
            <Headline
              errors={errors.length}
              warnings={warnings.length}
              complete={result.complete}
            />
            <p className="text-muted mt-1.5 text-sm">
              {result.complete
                ? "Hai tutti i componenti necessari."
                : `Mancano: ${missing.join(", ")}.`}
            </p>
          </>
        )}
      </section>

      {result.issues.length > 0 && (
        <section className="border-line border-t px-5 py-4">
          <h3 className="sr-only">Problemi</h3>
          <ul className="flex flex-col gap-4">
            {[...errors, ...warnings].map((issue) => (
              <li
                key={`${issue.code}-${issue.message}`}
                className="animate-enter grid grid-cols-[auto_1fr] gap-x-2.5"
              >
                {issue.severity === "error" ? (
                  <CircleX
                    className="text-error mt-0.5 size-4"
                    aria-label="Errore"
                  />
                ) : (
                  <TriangleAlert
                    className="text-warn mt-0.5 size-4"
                    aria-label="Avviso"
                  />
                )}
                <div>
                  <p className="text-sm">{issue.message}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {issue.components.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onFix(c)}
                        className="text-muted decoration-line-strong hover:text-accent hover:decoration-accent underline underline-offset-4"
                      >
                        Cambia {categoryNoun(c)}
                      </button>
                    ))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedItems.length > 0 && <Total items={selectedItems} />}

      <section className="border-line border-t px-5 py-4">
        <h3 className="text-muted text-xs font-medium">Alimentazione</h3>
        {hasCpuOrGpu ? (
          <Power
            estimatedW={result.power.estimatedW}
            recommendedW={result.power.recommendedPsuW}
            psuW={psuWattage}
          />
        ) : (
          <p className="text-faint mt-1.5 text-sm">
            Scegli processore e scheda video per stimare il consumo.
          </p>
        )}
      </section>

      <section className="border-line flex flex-wrap items-center gap-2 border-t px-5 py-4">
        <CopyLinkButton disabled={isEmpty} />
        {canUndo ? (
          <button type="button" onClick={onUndo} className={button.ghost}>
            <RotateCcw className="size-4" aria-hidden />
            Annulla svuota
          </button>
        ) : (
          <button
            type="button"
            onClick={onReset}
            disabled={isEmpty}
            className={button.ghost}
          >
            Svuota build
          </button>
        )}
      </section>
    </div>
  );
}

const dateTime = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function Total({ items }: { items: CatalogItem[] }) {
  const offers = items.map(bestOffer);
  const priced = offers.filter((o) => o !== undefined);
  const totalCents = priced.reduce((sum, o) => sum + o.priceCents, 0);
  const unpriced = offers.length - priced.length;
  // Il controllo più vecchio: il totale è aggiornato almeno fino a lì.
  const oldest = priced
    .map((o) => o.checkedAt)
    .sort()
    .at(0);

  return (
    <section className="border-line border-t px-5 py-4">
      <h3 className="text-muted text-xs font-medium">Prezzo</h3>
      <dl className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-y-1.5 text-sm">
        <dt className="text-muted">
          {priced.length === items.length
            ? "Totale, al prezzo migliore"
            : "Totale parziale"}
        </dt>
        <dd className="text-right font-mono text-base font-medium tabular-nums">
          {priced.length > 0 ? formatPrice(totalCents) : "—"}
        </dd>
      </dl>
      {unpriced > 0 && (
        <p className="text-faint mt-1.5 text-xs">
          {unpriced === 1
            ? "1 componente senza prezzo non è incluso."
            : `${unpriced} componenti senza prezzo non sono inclusi.`}
        </p>
      )}
      {oldest && (
        <p className="text-faint mt-1.5 text-xs">
          IVA inclusa, spedizione esclusa. Prezzi verificati dal{" "}
          {dateTime.format(new Date(oldest))}: fa fede il sito del negozio.
        </p>
      )}
    </section>
  );
}

function Headline({
  errors,
  warnings,
  complete,
}: {
  errors: number;
  warnings: number;
  complete: boolean;
}) {
  if (errors > 0) {
    return (
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <CircleX className="text-error size-5" aria-hidden />
        {errors === 1 ? "1 incompatibilità" : `${errors} incompatibilità`}
      </h2>
    );
  }
  if (warnings > 0) {
    return (
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <TriangleAlert className="text-warn size-5" aria-hidden />
        Compatibile,{" "}
        {warnings === 1 ? "con 1 avviso" : `con ${warnings} avvisi`}
      </h2>
    );
  }
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      <CircleCheck className="text-ok size-5" aria-hidden />
      {/* Con la build a metà "tutto compatibile" prometterebbe troppo. */}
      {complete ? "Tutto compatibile" : "Nessuna incompatibilità finora"}
    </h2>
  );
}

function Power({
  estimatedW,
  recommendedW,
  psuW,
}: {
  estimatedW: number;
  recommendedW: number;
  psuW: number | null;
}) {
  const load = psuW ? estimatedW / psuW : null;
  const tone =
    load === null
      ? "bg-accent"
      : psuW! < estimatedW
        ? "bg-error"
        : psuW! < recommendedW
          ? "bg-warn"
          : "bg-ok";

  return (
    <>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
        <dt className="text-muted">Consumo stimato</dt>
        <dd className="text-right font-mono tabular-nums">{estimatedW} W</dd>
        <dt className="text-muted">Alimentatore consigliato</dt>
        <dd className="text-right font-mono tabular-nums">
          ≥ {recommendedW} W
        </dd>
        {psuW && (
          <>
            <dt className="text-muted">Il tuo alimentatore</dt>
            <dd className="text-right font-mono tabular-nums">{psuW} W</dd>
          </>
        )}
      </dl>
      {load !== null && (
        <div className="mt-3">
          <div
            className="bg-line h-1.5 overflow-hidden rounded-full"
            role="meter"
            aria-label="Carico stimato sull'alimentatore"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(load * 100)}
          >
            <div
              className={`h-full origin-left rounded-full transition-transform duration-200 ease-out ${tone}`}
              style={{ transform: `scaleX(${Math.min(load, 1)})` }}
            />
          </div>
          <p className="text-muted mt-1.5 text-xs">
            Carico a pieno regime:{" "}
            <span className="font-mono tabular-nums">
              {Math.round(load * 100)}%
            </span>
          </p>
        </div>
      )}
    </>
  );
}

function CopyLinkButton({ disabled }: { disabled: boolean }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        navigator.clipboard
          .writeText(window.location.href)
          .then(() => setCopied(true))
          .catch(() => setCopied(false))
      }
      className={button.secondary}
    >
      {copied ? (
        <Check className="text-ok size-4" aria-hidden />
      ) : (
        <Link2 className="size-4" aria-hidden />
      )}
      <span aria-live="polite">{copied ? "Link copiato" : "Copia link"}</span>
    </button>
  );
}
