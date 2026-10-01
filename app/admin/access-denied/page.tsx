import Link from "next/link";
import { ShieldX, ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-background border border-border p-8 rounded-sm shadow-subtle">
        <div className="h-16 w-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldX className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-3xl text-foreground font-normal">
            Access Restricted
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You do not have the necessary administrative privileges or role authorization to access this operational area.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Return to Dashboard
            </Button>
          </Link>

          <Link href="/">
            <Button size="sm" className="w-full sm:w-auto text-xs">
              <Store className="mr-1.5 h-3.5 w-3.5" />
              Storefront
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
