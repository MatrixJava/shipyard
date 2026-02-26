"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { getTechIconUrl, TECH_STACK_OPTIONS } from "@/lib/tech-stack-options";

type TechStackSelectorProps = {
  label: string;
  selected: string[];
  onChange: (next: string[]) => void;
};

export function TechStackSelector({ label, selected, onChange }: TechStackSelectorProps) {
  const [customValue, setCustomValue] = useState("");

  const selectedSet = useMemo(() => new Set(selected.map((value) => value.toLowerCase())), [selected]);

  const toggleOption = (name: string) => {
    if (selectedSet.has(name.toLowerCase())) {
      onChange(selected.filter((value) => value.toLowerCase() !== name.toLowerCase()));
    } else {
      onChange([...selected, name]);
    }
  };

  const addCustom = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    if (selectedSet.has(trimmed.toLowerCase())) {
      setCustomValue("");
      return;
    }
    onChange([...selected, trimmed]);
    setCustomValue("");
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-200">{label}</p>
      <div className="flex flex-wrap gap-2">
        {TECH_STACK_OPTIONS.map((option) => {
          const active = selectedSet.has(option.label.toLowerCase());

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.label)}
              className={`stack-option-btn ${active ? "stack-option-btn-active" : ""}`}
            >
              <Image src={getTechIconUrl(option)} alt={`${option.label} logo`} width={16} height={16} unoptimized />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add custom tech"
          className="flex-1 min-w-[180px] rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
        />
        <button type="button" onClick={addCustom} className="legacy-link">
          Add
        </button>
      </div>
    </div>
  );
}
