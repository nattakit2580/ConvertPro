import Link from "next/link";
import { FileStack } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileStack className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">ConvertPro</p>
            <p className="text-sm text-muted-foreground">Secure document conversion platform.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/tools" className="hover:text-foreground">
            Tools
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
