import { Fragment } from "react";

import { specLine, type CatalogItem } from "~/lib/catalog";

/** Specifiche chiave: va a capo tra una voce e l'altra, mai dentro "3× M.2". */
export function SpecLine({ item }: { item: CatalogItem }) {
  const parts = specLine(item).split(" · ");
  return parts.map((part, i) => (
    <Fragment key={part}>
      <span className="whitespace-nowrap">{part}</span>
      {i < parts.length - 1 && " · "}
    </Fragment>
  ));
}
