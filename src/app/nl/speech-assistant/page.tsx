import { notFound } from "next/navigation";
import { getPlaygroundData } from "@/data/modules";
import { SpeechPlayground } from "@/components/playground/SpeechPlayground";

// The Speech Assistant's own playground page. A static segment under app/nl/
// takes precedence over [slug], so this tile gets a bespoke body while every
// other NL tile keeps the shared <Playground>. Co-located with the tile's
// build.py and lexicon.xml per CLAUDE.md §Tile co-location.
export default function Page() {
  const data = getPlaygroundData("nl", "speech-assistant");
  if (!data) notFound();

  return (
    <SpeechPlayground
      module={data.module}
      tile={data.tile}
      guide={data.guide}
      chapter={data.chapter}
    />
  );
}
