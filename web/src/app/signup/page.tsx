import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGateFallback } from "@/components/auth/AuthGate";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Create account · Applicant Tracker" };

// The form checks the session with the API on load, so it renders inside Suspense.
export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<AuthGateFallback />}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
