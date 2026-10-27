import { Suspense } from "react";

import { WebsiteHeader, WebsiteFooter } from "@/components/chrome";

/**
 * The pages that sit inside the didit.me header and footer: the module
 * catalogue and the industry demos that have not moved to the Demo Center
 * shell yet. The hub and the shell demos bring their own chrome.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas font-sans">
      <WebsiteHeader />
      <main className="min-h-[60vh]">
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <span className="size-8 animate-spin rounded-pill border-2 border-line border-t-blue" />
                <p className="text-sm text-muted">Loading…</p>
              </div>
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
      <WebsiteFooter />
    </div>
  );
}
