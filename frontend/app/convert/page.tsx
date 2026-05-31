import { UploadConverter } from "@/components/upload-converter";
import { Suspense } from "react";

export default function ConvertPage() {
  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Convert</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">Upload, convert, and download</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Drag files into the secure workspace, select an output format, then track progress in real time.
          </p>
        </div>
        <Suspense fallback={<div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">Loading converter...</div>}>
          <UploadConverter />
        </Suspense>
      </div>
    </section>
  );
}
