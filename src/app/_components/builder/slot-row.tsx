"use client";

import { CircleX, TriangleAlert, X } from "lucide-react";
import type { ReactNode, RefObject } from "react";

import { CATEGORY_LABEL, categoryNoun, type CatalogItem } from "~/lib/catalog";
import type { Category, Severity } from "~/lib/engine";
import { SpecLine } from "./spec-line";
import { button, CATEGORY_ICON } from "./ui";

export function SlotRow({
  category,
  items,
  severity,
  hint,
  isOpen,
  isNext,
  toggleRef,
  onToggle,
  onRemove,
  children,
}: {
  category: Category;
  /** Componenti scelti per lo slot: più di uno solo per l'archiviazione. */
  items: CatalogItem[];
  severity: Severity | null;
  /** Spiegazione quando lo slot è facoltativo (es. CPU con grafica integrata). */
  hint: string | null;
  isOpen: boolean;
  /** Primo slot obbligatorio ancora vuoto: la sua azione è quella primaria. */
  isNext: boolean;
  toggleRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
  onRemove: (slug: string) => void;
  /** Il picker, quando lo slot è aperto. */
  children?: ReactNode;
}) {
  const Icon = CATEGORY_ICON[category];
  const label = CATEGORY_LABEL[category];
  const multi = category === "STORAGE";
  const empty = items.length === 0;
  const pickerId = `picker-${category}`;

  const actionLabel = isOpen
    ? "Chiudi"
    : multi
      ? empty
        ? "Scegli"
        : "Aggiungi"
      : empty
        ? "Scegli"
        : "Cambia";

  return (
    <li className={isOpen ? "bg-panel/60" : undefined}>
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 px-3 py-3.5 sm:gap-x-4 sm:px-4">
        <Icon
          className={`mt-0.5 size-5 ${isOpen ? "text-accent" : "text-faint"}`}
          aria-hidden
        />

        <div className="min-w-0">
          <h3 className="text-muted flex items-center gap-1.5 text-xs font-medium">
            {label}
            {severity === "error" && (
              <CircleX
                className="text-error size-3.5"
                aria-label="Incompatibile"
              />
            )}
            {severity === "warning" && (
              <TriangleAlert
                className="text-warn size-3.5"
                aria-label="Avviso"
              />
            )}
          </h3>

          {empty ? (
            <p className="text-faint mt-0.5 text-sm">
              {hint ?? `Nessun componente scelto`}
            </p>
          ) : (
            <ul className="mt-0.5 flex flex-col gap-2">
              {items.map((item, i) => (
                <li
                  key={`${item.slug}-${i}`}
                  className="flex items-start gap-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-pretty">
                      {item.brand} {item.model}
                    </p>
                    <p className="text-muted mt-0.5 font-mono text-xs tabular-nums">
                      <SpecLine item={item} />
                    </p>
                  </div>
                  {multi && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.slug)}
                      className={`${button.icon} -my-2`}
                      aria-label={`Rimuovi ${item.brand} ${item.model}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!multi && !empty && !isOpen && (
            <button
              type="button"
              onClick={() => onRemove(items[0]!.slug)}
              className={button.icon}
              aria-label={`Rimuovi ${categoryNoun(category)}`}
            >
              <X className="size-4" />
            </button>
          )}
          <button
            ref={toggleRef}
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={isOpen ? pickerId : undefined}
            className={isNext && !isOpen ? button.primary : button.secondary}
          >
            {actionLabel}
            <span className="sr-only"> {categoryNoun(category)}</span>
          </button>
        </div>
      </div>

      {isOpen && <div id={pickerId}>{children}</div>}
    </li>
  );
}
