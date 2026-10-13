import { Builder } from "~/app/_components/builder/builder";
import { selectionFromParams } from "~/lib/catalog";
import { getCatalog } from "~/server/catalog";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [catalog, params] = await Promise.all([getCatalog(), searchParams]);
  const bySlug = new Map(catalog.map((item) => [item.slug, item]));

  return (
    <Builder
      catalog={catalog}
      initialSelection={selectionFromParams(params, bySlug)}
    />
  );
}
