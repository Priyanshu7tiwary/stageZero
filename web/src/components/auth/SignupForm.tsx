"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, bannerError } from "@/lib/api";
import { useAuth, useAuthCheck } from "@/lib/auth";
import type { SignupInput } from "@/lib/types";
import { fieldErrors, signupSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { AuthGateFallback } from "./AuthGate";

const EMPTY: SignupInput = { name: "", email: "", password: "" };

export function SignupForm() {
  useAuthCheck(); // already signed in? (checked with the API on page load)
  const { state, signUp } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState<SignupInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  // Signed in (already, or just now): go to the dashboard.
  useEffect(() => {
    if (state.status === "authenticated") router.replace("/");
  }, [state.status, router]);

  const set = (key: keyof SignupInput) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setSubmitError(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      await signUp(parsed.data);
    } catch (err) {
      setSubmitError(err);
      if (err instanceof ApiError) setErrors(err.fields);
      setSubmitting(false);
    }
  }

  if (state.status === "checking" || state.status === "authenticated") return <AuthGateFallback />;
  const banner = bannerError(submitError);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-tight text-zinc-500">Applicant Tracker</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="mt-1 text-sm text-zinc-500">Start tracking candidates through your hiring pipeline.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        {banner && <Alert>{banner}</Alert>}
        <TextField
          label="Name"
          autoComplete="name"
          value={values.name}
          onChange={(e) => set("name")(e.target.value)}
          error={errors.name}
          autoFocus
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          value={values.email}
          onChange={(e) => set("email")(e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          hint="(8+ characters)"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set("password")(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
