import { Suspense } from "react";
import { Sidebar } from "@/components/nav/Sidebar";

// The sidebar reads the current path to highlight the active link, so it sits
// inside Suspense (required with cacheComponents).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense>
        <Sidebar />
      </Suspense>
      <div className="flex min-h-full flex-1 flex-col lg:pl-60">
        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </>
  );
}
