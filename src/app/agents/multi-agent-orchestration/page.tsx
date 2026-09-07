import { notFound } from "next/navigation";
import { getPlaygroundData } from "@/data/modules";
import { OrchestrationPlayground } from "@/components/playground/OrchestrationPlayground";

// The Multi-Agent Orchestration tile's own page. A static segment under
// app/agents/ wins over [slug], so this tile gets its bespoke timeline body
// while every other Agents tile falls back to the shared <Playground>.
// Co-located with build.py, workflow.yaml and the README.
export default function Page() {
  const data = getPlaygroundData("agents", "multi-agent-orchestration");
  if (!data) notFound();

  return (
    <OrchestrationPlayground
      module={data.module}
      tile={data.tile}
      guide={data.guide}
      chapter={data.chapter}
    />
  );
}
