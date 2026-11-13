"use client";

import { useId, useState, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * Free-text tags: Enter or comma adds one, Backspace on an empty box removes
 * the last, pasting "a, b, c" adds all three. Duplicates are ignored
 * case-insensitively. Text still in the box is added on blur, so a skill
 * typed just before submitting isn't lost.
 */
export function TagInput({
  label,
  values,
  onChange,
  error,
  hint,
  placeholder,
  maxLength = 40,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const next = [...values];
    for (const part of raw.split(",")) {
      const tag = part.trim().slice(0, maxLength);
      if (tag && !next.some((v) => v.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    if (next.length !== values.length) onChange(next);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (text.includes(",")) {
      e.preventDefault();
      add(draft + text);
    }
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
        {hint && <span className="ml-1 font-normal text-zinc-400">{hint}</span>}
      </label>
      <div
        className={`flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md bg-white px-2 py-1.5 ring-1 ring-inset focus-within:ring-2 ${
          error ? "ring-rose-400 focus-within:ring-rose-500" : "ring-zinc-300 focus-within:ring-zinc-900"
        }`}
      >
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-zinc-100 py-0.5 pr-1 pl-2 text-xs font-medium text-zinc-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== tag))}
              aria-label={`Remove ${tag}`}
              className="rounded px-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={values.length ? "" : placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          className="min-w-24 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
        />
      </div>
      <p id={`${id}-help`} className="text-xs text-zinc-400">
        Press Enter or comma to add.
      </p>
      {error && (
        <p id={`${id}-error`} className="text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
