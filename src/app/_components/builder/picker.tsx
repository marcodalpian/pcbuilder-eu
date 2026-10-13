"use client";

import { Check, CircleX, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { categoryNoun, type CatalogItem } from "~/lib/catalog";
import { SpecLine } from "./spec-line";
import type { Category, Issue } from "~/lib/engine";

type Candidate = { item: CatalogItem; problems: Issue[] };

// Sotto questa soglia la ricerca è solo rumore: la lista si legge a colpo d'occhio.
const SEARCH_THRESHOLD = 7;

export function Picker({
  category,
  items,
  selected,
  evaluate,
  onPick,
  onClose,
}: {
  category: Category;
  items: CatalogItem[];
  selected: string[];
  /** Errori che il candidato introdurrebbe nella build attuale. */
  evaluate: (item: CatalogItem) => Issue[];
  onPick: (slug: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const listId = useId();

  const { compatible, incompatible } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const candidates: Candidate[] = items
      .filter(
        (item) => !q || `${item.brand} ${item.model}`.toLowerCase().includes(q),
      )
      .map((item) => ({ item, problems: evaluate(item) }));
    return {
      compatible: candidates.filter((c) => c.problems.length === 0),
      incompatible: candidates.filter((c) => c.problems.length > 0),
    };
  }, [items, query, evaluate]);

  const label = categoryNoun(category);

  return (
    <div
      className="animate-enter border-line bg-panel border-t px-3 pt-3 pb-4 sm:px-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {items.length >= SEARCH_THRESHOLD && (
        <label className="border-line-strong bg-bg focus-within:border-accent mb-3 flex h-10 items-center gap-2 rounded-md border px-3">
          <Search className="text-faint size-4" aria-hidden />
          <span className="sr-only">Cerca {label}</span>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cerca ${label} per marca o modello`}
            className="placeholder:text-faint h-full w-full bg-transparent text-sm focus:outline-none"
            aria-controls={listId}
          />
        </label>
      )}

      <div id={listId}>
        {compatible.length === 0 && incompatible.length === 0 && (
          <p className="text-muted px-1 py-6 text-center text-sm">
            {query
              ? `Nessun risultato per “${query}”.`
              : "Nessun componente in catalogo per questa categoria."}
          </p>
        )}

        {compatible.length > 0 && (
          <OptionList
            candidates={compatible}
            selected={selected}
            onPick={onPick}
            autoFocusFirst={items.length < SEARCH_THRESHOLD}
          />
        )}

        {incompatible.length > 0 && (
          <>
            <h4 className="text-muted mt-4 mb-1.5 px-1 text-xs font-medium">
              Non compatibili con la build attuale
            </h4>
            <OptionList
              candidates={incompatible}
              selected={selected}
              onPick={onPick}
            />
          </>
        )}
      </div>
    </div>
  );
}

function OptionList({
  candidates,
  selected,
  onPick,
  autoFocusFirst = false,
}: {
  candidates: Candidate[];
  selected: string[];
  onPick: (slug: string) => void;
  autoFocusFirst?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {candidates.map(({ item, problems }, i) => {
        const isSelected = selected.includes(item.slug);
        const blocked = problems.length > 0;
        return (
          <li key={item.slug}>
            <button
              type="button"
              autoFocus={autoFocusFirst && i === 0}
              aria-pressed={isSelected}
              onClick={() => onPick(item.slug)}
              className={`press hover:bg-raised grid w-full grid-cols-[1fr_auto] items-start gap-3 rounded-md px-3 py-2.5 text-left ${
                isSelected ? "bg-accent-soft" : ""
              }`}
            >
              <span className={blocked ? "opacity-70" : ""}>
                <span className="text-fg block text-sm font-medium">
                  {item.brand} {item.model}
                </span>
                <span className="text-muted mt-0.5 block font-mono text-xs tabular-nums">
                  <SpecLine item={item} />
                </span>
                {problems[0] && (
                  <span className="text-error mt-1.5 flex items-start gap-1.5 text-xs">
                    <CircleX className="mt-px size-3.5 shrink-0" aria-hidden />
                    {problems[0].message}
                  </span>
                )}
              </span>
              {isSelected && (
                <Check
                  className="text-accent mt-0.5 size-4"
                  aria-label="Selezionato"
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
