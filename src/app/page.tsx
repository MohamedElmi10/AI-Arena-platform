import { Hero } from "@/components/Hero";
import { ModuleSection } from "@/components/ModuleSection";
import { modules } from "@/data/modules";

export default function Home() {
  return (
    <main className="paper min-h-full flex-1">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Hero />
        {modules.map((module, index) => (
          <ModuleSection key={module.id} module={module} index={index} />
        ))}
      </div>
    </main>
  );
}
