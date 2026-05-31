import { CheckCircle2 } from "lucide-react";
import { PricingCard } from "@/components/pricing-card";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For quick individual conversions.",
    features: ["10 MB max file size", "5 conversions per day", "Core PDF tools", "1 hour secure file expiry"],
    cta: "Start Free",
    highlighted: false
  },
  {
    name: "Pro",
    price: "$12",
    description: "For frequent file work and OCR.",
    features: ["100 MB max file size", "Unlimited conversions", "OCR enabled", "Priority queue"],
    cta: "Upgrade to Pro",
    highlighted: true
  },
  {
    name: "Business",
    price: "$39",
    description: "For teams, API workflows, and batch operations.",
    features: ["API Access", "Batch Convert", "Team Management", "Advanced admin controls"],
    cta: "Contact Sales",
    highlighted: false
  }
];

export default function PricingPage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Simple plans for secure conversion
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal">Pricing that scales with your files</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Start with the free plan, then unlock larger files, OCR, API access, and team workflows.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
