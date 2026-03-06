"use client";

import { useState, useRef, useEffect } from "react";
import { JERSEY_COLOR_MAP } from "@/lib/jerseyColors";

const PRESET_COLORS = Object.entries(JERSEY_COLOR_MAP).map(([name, hex]) => ({ name, hex }));

interface Props {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorDot({ hex, name }: { hex: string; name: string }) {
  const isLight = name === "White" || name === "Yellow" || name === "Gold";
  return (
    <span
      className={`inline-block w-4 h-4 rounded-full flex-shrink-0 ${isLight ? "border border-gray-300" : ""}`}
      style={{ backgroundColor: hex }}
    />
  );
}

export default function JerseyColorPicker({ label, value, onChange }: Props) {
  const preset = PRESET_COLORS.find((c) => c.name === value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? PRESET_COLORS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : PRESET_COLORS;

  // Exact match in presets?
  const exactMatch = PRESET_COLORS.find(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase()
  );
  // Show "Use: [query]" option when query has no exact preset match and has content
  const showCustomOption = query.trim() !== "" && !exactMatch;

  function openDropdown() {
    setQuery("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function selectPreset(name: string) {
    onChange(name);
    setQuery("");
    setOpen(false);
  }

  function selectCustom() {
    onChange(query.trim());
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length === 1) {
        selectPreset(filtered[0].name);
      } else if (showCustomOption) {
        selectCustom();
      }
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef}>
      <label className="label">{label}</label>

      {/* Trigger / search input */}
      {open ? (
        <div className="relative">
          <input
            ref={inputRef}
            className="input pr-8"
            placeholder="Type to filter colors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openDropdown}
          className="input flex items-center justify-between text-left"
        >
          {preset ? (
            <span className="flex items-center gap-2">
              <ColorDot hex={preset.hex} name={preset.name} />
              <span>{preset.name}</span>
            </span>
          ) : value ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full bg-gray-300 border border-gray-400 flex-shrink-0" />
              <span>{value}</span>
            </span>
          ) : (
            <span className="text-gray-400">Select or type a color...</span>
          )}
          <span className="text-gray-400 ml-2">▼</span>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20 relative">
          <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {filtered.map(({ name, hex }) => (
              <li key={name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                  onClick={() => selectPreset(name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors active:bg-gray-50 ${
                    value === name ? "bg-brand-50 font-semibold text-brand-700" : "text-gray-800"
                  }`}
                >
                  <ColorDot hex={hex} name={name} />
                  {name}
                  {value === name && <span className="ml-auto text-brand-600">✓</span>}
                </button>
              </li>
            ))}

            {filtered.length === 0 && !showCustomOption && (
              <li className="px-4 py-3 text-sm text-gray-400">No colors match.</li>
            )}

            {showCustomOption && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={selectCustom}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-brand-700 font-medium active:bg-brand-50 transition-colors"
                >
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-dashed border-brand-400 flex-shrink-0" />
                  Use &quot;{query.trim()}&quot;
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
