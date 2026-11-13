import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

const CONTROL =
  "block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-zinc-900 ring-1 ring-inset placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-inset";

function controlClass(error?: string) {
  return `${CONTROL} ${error ? "ring-rose-400 focus:ring-rose-500" : "ring-zinc-300 focus:ring-zinc-900"}`;
}

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  id: string;
  children: React.ReactNode;
}

function FieldShell({ label, error, hint, id, children }: FieldShellProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
        {hint && <span className="ml-1 font-normal text-zinc-400">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} id={id}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={controlClass(error)}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} id={id}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={controlClass(error)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
