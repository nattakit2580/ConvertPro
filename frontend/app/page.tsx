import Link from "next/link";
import { ArrowRight, CheckCircle2, FileArchive, FileText, Gauge, LockKeyhole, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const supported = ["PDF", "DOCX", "XLSX", "PPTX", "JPG", "PNG"];
const steps = ["Upload", "Convert", "Download"];
const benefits = [
  { title: "Fast Conversion", detail: "Queue-backed processing keeps large jobs responsive.", icon: Gauge },
  { title: "Secure Processing", detail: "UUID filenames, signed downloads, and automatic expiry.", icon: LockKeyhole },
  { title: "High Accuracy", detail: "Dedicated engines for text, tables, images, and OCR.", icon: Sparkles },
  { title: "Multi-format Support", detail: "Built for PDF, Office files, images, and future tools.", icon: FileArchive }
];

export default function HomePage() {
  return (
    <>
      <section className="hero-photo flex min-h-[calc(100vh-132px)] items-center">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-sm backdrop-blur">
              <CheckCircle2 className="h-4 w-4 text-cyan-200" />
              Professional document conversion platform
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              Convert Files Fast, Secure, and Professional
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/86">
              Convert PDF, Office documents, images, and scanned files with a secure workflow designed for real SaaS operations.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 px-7 text-base">
                <Link href="/convert">
                  <UploadCloud className="mr-2 h-5 w-5" />
                  Upload File
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 border-white/30 bg-white/10 px-7 text-base text-white hover:bg-white/18">
                <Link href="/tools">
                  View Tools
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {supported.map((item) => (
                <span key={item} className="rounded-full bg-white/14 px-3 py-1 text-sm text-white/90 ring-1 ring-white/18">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Step {index + 1}</p>
                <p className="text-lg font-semibold">{step}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Why ConvertPro</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal">Built for everyday teams and serious workflows</h2>
            </div>
            <FileText className="hidden h-10 w-10 text-accent sm:block" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="shadow-sm">
                <CardContent className="p-6">
                  <benefit.icon className="mb-5 h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{benefit.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
