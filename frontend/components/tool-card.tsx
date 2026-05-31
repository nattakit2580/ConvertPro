import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ConversionTool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: ConversionTool }) {
  return (
    <Link href={`/convert?tool=${tool.id}`} className="group block">
      <Card className="h-full bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
        <CardContent className="flex h-full flex-col p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <tool.icon className="h-6 w-6" />
            </span>
            <Badge className={tool.mvp ? "border-accent/30 text-accent" : "border-secondary/30 text-secondary"}>
              {tool.mvp ? "MVP" : "Extended"}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold">{tool.title}</h2>
          <p className="mt-3 min-h-[48px] text-sm leading-6 text-muted-foreground">{tool.description}</p>
          <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm">
            <span className="text-muted-foreground">{tool.inputs}</span>
            <span className="flex items-center gap-1 font-medium text-primary">
              Open
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
