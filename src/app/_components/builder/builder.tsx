"use client";

import { createRef, useCallback, useEffect, useMemo, useState } from "react";

import {
  emptySelection,
  selectionToParams,
  SLOTS,
  toBuildInput,
  type CatalogItem,
  type Selection,
} from "~/lib/catalog";
import {
  checkCompatibility,
  introducedErrors,
  type BuildInput,
  type Category,
  type Severity,
} from "~/lib/engine";
import { Picker } from "./picker";
import { SlotRow } from "./slot-row";
import { StatusPanel } from "./status-panel";

const SLOT_KEY = {
  CPU: "cpu",
  COOLER: "cooler",
  MOTHERBOARD: "motherboard",
  MEMORY: "memory",
  GPU: "gpu",
  STORAGE: "storage",
  PSU: "psu",
  CASE: "case",
} as const satisfies Record<Category, keyof BuildInput>;

export function Builder({
  catalog,
  initialSelection,
}: {
  catalog: CatalogItem[];
  initialSelection: Selection;
}) {
  const [selection, setSelection] = useState(initialSelection);
  const [open, setOpen] = useState<Category | null>(null);
  const [undo, setUndo] = useState<Selection | null>(null);

  const bySlug = useMemo(
    () => new Map(catalog.map((item) => [item.slug, item])),
    [catalog],
  );
  const byCategory = useMemo(() => {
    const map = new Map<Category, CatalogItem[]>();
    for (const item of catalog) {
      map.set(item.category, [...(map.get(item.category) ?? []), item]);
    }
    return map;
  }, [catalog]);
  const toggleRefs = useMemo(
    () =>
      Object.fromEntries(
        SLOTS.map((c) => [c, createRef<HTMLButtonElement>()]),
      ) as Record<Category, React.RefObject<HTMLButtonElement | null>>,
    [],
  );

  const input = useMemo(
    () => toBuildInput(selection, bySlug),
    [selection, bySlug],
  );
  const result = useMemo(() => checkCompatibility(input), [input]);

  // La build vive nell'URL: ricaricare o condividere il link la ripristina.
  useEffect(() => {
    const qs = selectionToParams(selection).toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, [selection]);

  const itemsFor = (cat: Category): CatalogItem[] => {
    const slugs = cat === "STORAGE" ? selection.STORAGE : [selection[cat]];
    return slugs
      .map((s) => (s ? bySlug.get(s) : undefined))
      .filter((i): i is CatalogItem => !!i);
  };

  const severityFor = (cat: Category): Severity | null => {
    const related = result.issues.filter((i) => i.components.includes(cat));
    if (related.some((i) => i.severity === "error")) return "error";
    return related.length ? "warning" : null;
  };

  const hintFor = (cat: Category): string | null => {
    if (cat === "GPU" && input.cpu?.integratedGraphics)
      return "Facoltativa: il processore ha la grafica integrata.";
    if (cat === "COOLER" && input.cpu?.includesCooler)
      return "Facoltativo: il processore include un dissipatore.";
    return null;
  };

  const nextRequired = SLOTS.find((c) => result.missing.includes(c)) ?? null;

  const evaluate = useCallback(
    (item: CatalogItem) => {
      const key = SLOT_KEY[item.category];
      if (item.category === "STORAGE") {
        return introducedErrors(input, {
          storage: [...(input.storage ?? []), item.specs],
        });
      }
      // Confronto con la build senza lo slot: chi sostituisce non eredita i problemi del componente attuale.
      const base = { ...input, [key]: undefined };
      const value = item.category === "MEMORY" ? [item.specs] : item.specs;
      return introducedErrors(base, { [key]: value });
    },
    [input],
  );

  const update = (next: Selection) => {
    setSelection(next);
    setUndo(null);
  };

  const close = (cat: Category) => {
    setOpen(null);
    toggleRefs[cat].current?.focus();
  };

  const pick = (cat: Category, slug: string) => {
    update(
      cat === "STORAGE"
        ? { ...selection, STORAGE: [...selection.STORAGE, slug] }
        : { ...selection, [cat]: slug },
    );
    close(cat);
  };

  const remove = (cat: Category, slug: string) => {
    if (cat === "STORAGE") {
      const i = selection.STORAGE.indexOf(slug);
      update({
        ...selection,
        STORAGE: selection.STORAGE.filter((_, j) => j !== i),
      });
    } else {
      update({ ...selection, [cat]: undefined });
    }
  };

  const fix = (cat: Category) => {
    setOpen(cat);
    requestAnimationFrame(() =>
      toggleRefs[cat].current
        ?.closest("li")
        ?.scrollIntoView({ block: "nearest" }),
    );
  };

  const isEmpty = SLOTS.every((c) => itemsFor(c).length === 0);

  return (
    <div className="min-h-screen">
      <header className="border-line border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <p className="text-[15px] font-semibold tracking-tight">
            PCBuilder <span className="text-muted font-normal">EU</span>
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <section aria-labelledby="build-title" className="min-w-0">
          <h1
            id="build-title"
            className="text-2xl font-semibold tracking-tight"
          >
            La tua build
          </h1>
          <p className="text-muted mt-2 max-w-prose text-sm">
            Scegli i componenti uno alla volta: le incompatibilità e
            l&apos;alimentatore necessario si aggiornano a ogni scelta.
          </p>

          <ol className="divide-line border-line mt-6 divide-y overflow-hidden rounded-lg border">
            {SLOTS.map((cat) => (
              <SlotRow
                key={cat}
                category={cat}
                items={itemsFor(cat)}
                severity={severityFor(cat)}
                hint={hintFor(cat)}
                isOpen={open === cat}
                isNext={cat === nextRequired}
                toggleRef={toggleRefs[cat]}
                onToggle={() => (open === cat ? close(cat) : setOpen(cat))}
                onRemove={(slug) => remove(cat, slug)}
              >
                <Picker
                  category={cat}
                  items={byCategory.get(cat) ?? []}
                  selected={
                    cat === "STORAGE" ? [] : itemsFor(cat).map((i) => i.slug)
                  }
                  evaluate={evaluate}
                  onPick={(slug) => pick(cat, slug)}
                  onClose={() => close(cat)}
                />
              </SlotRow>
            ))}
          </ol>
        </section>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <StatusPanel
            result={result}
            selectedItems={SLOTS.flatMap(itemsFor)}
            isEmpty={isEmpty}
            hasCpuOrGpu={!!(input.cpu ?? input.gpu)}
            psuWattage={input.psu?.wattage ?? null}
            canUndo={!!undo}
            onFix={fix}
            onReset={() => {
              setUndo(selection);
              setSelection(emptySelection());
              setOpen(null);
            }}
            onUndo={() => {
              if (undo) setSelection(undo);
              setUndo(null);
            }}
          />
          <p className="text-faint mt-3 px-1 text-xs">
            Specifiche indicative: prima di acquistare verifica sempre la scheda
            del produttore.
          </p>
        </aside>
      </main>
    </div>
  );
}
