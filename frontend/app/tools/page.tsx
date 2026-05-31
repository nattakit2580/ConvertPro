import { ToolCard } from "@/components/tool-card";
import { conversionTools } from "@/lib/tools";

export default function ToolsPage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tools</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">Document conversion tools</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Choose a conversion workflow and process files through the same secure backend pipeline.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversionTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
