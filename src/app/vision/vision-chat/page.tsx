import { notFound } from "next/navigation";
import { getPlaygroundData } from "@/data/modules";
import { VisionPlayground } from "@/components/playground/VisionPlayground";

// The Vision Chat tile's own page. A static segment under app/vision/ wins over
// [slug], so this tile gets a bespoke body while every other Vision tile falls
// back to the shared <Playground>. Co-located with build.py and the samples.
export default function Page() {
  const data = getPlaygroundData("vision", "vision-chat");
  if (!data) notFound();

  return (
    <VisionPlayground
      module={data.module}
      tile={data.tile}
      guide={data.guide}
      chapter={data.chapter}
    />
  );
}
