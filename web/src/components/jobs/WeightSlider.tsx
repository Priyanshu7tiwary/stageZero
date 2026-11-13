"use client";

import { useId } from "react";

/**
 * One slider sets the skills ↔ experience trade-off for the AI score.
 * The two weights always add up to 100%.
 */
export function WeightSlider({
  skillsWeight,
  onChange,
}: {
  skillsWeight: number;
  onChange: (skillsWeight: number) => void;
}) {
  const id = useId();
  const experienceWeight = 100 - skillsWeight;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        Screening weight
      </label>
      <div className="flex items-center justify-between text-sm">
        <span>
          Skills <span className="font-semibold tabular-nums">{skillsWeight}%</span>
        </span>
        <span>
          <span className="font-semibold tabular-nums">{experienceWeight}%</span> Experience
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={skillsWeight}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`Skills ${skillsWeight}%, experience ${experienceWeight}%`}
        className="w-full accent-zinc-900"
      />
      <p className="text-xs text-zinc-500">
        {skillsWeight === 50
          ? "Skills and experience count equally."
          : skillsWeight > 50
            ? "Matching the required skills matters more than years of experience."
            : "Years of experience matters more than matching every skill."}
      </p>
    </div>
  );
}
