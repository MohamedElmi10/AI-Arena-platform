import { notFound } from "next/navigation";
import { getPlaygroundData } from "@/data/modules";
import { ContentUnderstandingPlayground } from "@/components/playground/ContentUnderstandingPlayground";

// The Content Understanding tile's own page. A static segment under app/vision/
// wins over [slug], so this tile gets a bespoke body (preset picker, file
// dropzone, ExtractionResult) while every other Vision tile falls back to the
// shared <Playground>. Co-located with build.py, the samples and the canned A/V.
export default function Page() {
  const data = getPlaygroundData("vision", "content-understanding");
  if (!data) notFound();

  return (
    <ContentUnderstandingPlayground
      module={data.module}
      tile={data.tile}
      guide={data.guide}
      chapter={data.chapter}
    />
  );
}
