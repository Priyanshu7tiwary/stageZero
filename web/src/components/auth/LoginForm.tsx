"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, bannerError } from "@/lib/api";
import { safeNextPath, useAuth } from "@/lib/auth";
import type { LoginInput } from "@/lib/types";
import { fieldErrors, loginSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/States";
import { AuthGateFallback } from "./AuthGate";

// Created by the API seed script. Shown on purpose: this is a demo app.
const DEMO: LoginInput = { email: "recruiter@example.com", password: "password123" };

export function LoginForm() {
  const { state, signIn } = useAuth();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));

  const [values, setValues] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (or just signed in): go where the user was heading.
  useEffect(() => {
    if (state.status === "authenticated") router.replace(next);
  }, [state.status, next, router]);

  const set = (key: keyof LoginInput) => (value: string) => {
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
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await signIn(parsed.data);
      // Redirect happens in the effect above once auth state updates.
    } catch (err) {
      setSubmitError(err);
      if (err instanceof ApiError) setErrors(err.fields);
      setSubmitting(false);
    }
  }

  if (state.status === "checking" || state.status === "authenticated") {
    return <AuthGateFallback />;
  }

  const banner = bannerError(submitError);

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-tight text-zinc-500">Applicant Tracker</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">Track candidates through your hiring pipeline.</p>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        {banner && <Alert>{banner}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          value={values.email}
          onChange={(e) => set("email")(e.target.value)}
          error={errors.email}
          autoFocus
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => set("password")(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>

      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600">
        <p>
          Demo account: <span className="font-medium text-zinc-800">{DEMO.email}</span> /{" "}
          <span className="font-medium text-zinc-800">{DEMO.password}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setValues(DEMO);
            setErrors({});
            setSubmitError(null);
          }}
          className="mt-1 text-sm font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
        >
          Fill in demo account
        </button>
      </div>
    </div>
  );
}
