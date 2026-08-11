import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyOwnerDetailPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  redirect(id ? `/menu/owner-outlet/${id}` : "/menu/owner-outlet");
}
