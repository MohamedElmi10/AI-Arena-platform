import { notFound } from "next/navigation";
import { getPlaygroundData } from "@/data/modules";
import { Playground } from "@/components/playground/Playground";

// Thin wrapper — the "nl" module's playground route. All three module routes
// share the same components; only the module id differs. A slug with no guide
// content 404s (per T-004: only foundry-chat-agent is playable so far).
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getPlaygroundData("nl", slug);
  if (!data) notFound();

  return (
    <Playground
      module={data.module}
      tile={data.tile}
      guide={data.guide}
      chapter={data.chapter}
    />
  );
}
