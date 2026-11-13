import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthGateFallback } from "@/components/auth/AuthGate";

export const metadata: Metadata = { title: "Sign in · Applicant Tracker" };

// LoginForm reads `?next=` from the URL, so it renders inside Suspense
// (required with cacheComponents).
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<AuthGateFallback />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
