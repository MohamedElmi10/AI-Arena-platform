import { notFound } from "next/navigation";
import { getPlaygroundData } from "@/data/modules";
import { Playground } from "@/components/playground/Playground";

// Thin wrapper — the "vision" module's playground route, mirroring agents/[slug],
// genai/[slug] and nl/[slug]. Without this file a live Vision tile 404s, since
// nothing else maps /vision/<slug> to a page.
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getPlaygroundData("vision", slug);
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
