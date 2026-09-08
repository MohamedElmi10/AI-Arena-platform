import { notFound } from "next/navigation";
import { getPlaygroundData } from "@/data/modules";
import { DocumentIntelligencePlayground } from "@/components/playground/DocumentIntelligencePlayground";

// The Document Intelligence tile's own page. A static segment under app/vision/
// wins over [slug], so this tile gets a bespoke body (doc-type picker, the
// AnnotationOverlay showpiece, hover-linked ExtractionResult) while every other
// Vision tile falls back to the shared <Playground>.
export default function Page() {
  const data = getPlaygroundData("vision", "document-intelligence");
  if (!data) notFound();

  return (
    <DocumentIntelligencePlayground
      module={data.module}
      tile={data.tile}
      guide={data.guide}
      chapter={data.chapter}
    />
  );
}
