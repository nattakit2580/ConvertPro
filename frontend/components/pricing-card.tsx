import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
};

export function PricingCard({ plan }: { plan: Plan }) {
  return (
    <Card className={cn("bg-white shadow-sm", plan.highlighted && "border-primary shadow-soft")}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{plan.name}</CardTitle>
          {plan.highlighted && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Popular</span>}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <span className="text-4xl font-semibold">{plan.price}</span>
          {plan.price !== "$0" && <span className="text-muted-foreground"> / month</span>}
        </div>
        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-3 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-8 w-full" variant={plan.highlighted ? "default" : "outline"}>
          <Link href={plan.name === "Business" ? "/register" : "/convert"}>{plan.cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
