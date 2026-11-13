import { Suspense } from "react";
import { AuthGate, AuthGateFallback } from "@/components/auth/AuthGate";
import { Sidebar } from "@/components/nav/Sidebar";

// Every page in this group needs a signed-in user. The gate and sidebar read
// the current path, so they sit inside Suspense (required with cacheComponents).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AuthGateFallback />}>
      <AuthGate>
        <Sidebar />
        <div className="flex min-h-full flex-1 flex-col lg:pl-60">
          <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </AuthGate>
    </Suspense>
  );
}
