"use client";

import { useEffect, useState, KeyboardEvent, ChangeEvent } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

const DIET_OPTIONS: string[] = [
  "Any / No preference",
  "Vegetarian",
  "Lacto vegetarian",
  "Ovo vegetarian",
  "Lacto ovo vegetarian",
  "Vegan",
  "Pescetarian",
  "Non vegetarian",

  "Gluten free",
  "Dairy free",
  "Nut free",
  "Egg free",
  "Soy free",

  "Keto",
  "Low carb",
  "Low fat",
  "Low sodium",
  "Diabetic friendly",

  "Halal",
  "Kosher",

  "Paleo",
  "Mediterranean",
  "Whole food plant-based",
];

type DietSuggestion = { name: string };

export default function DietAutocomplete({ value, onChange }: Props) {
  const [inputValue, setInputValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState<DietSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  // keep in sync when parent changes value
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // filter list whenever user types
  useEffect(() => {
    const q = (inputValue || "").trim().toLowerCase();

    let base = DIET_OPTIONS;

    if (q.length > 0) {
      // prefix match first
      base = DIET_OPTIONS.filter((diet) =>
        diet.toLowerCase().startsWith(q)
      );
      // fallback: any substring
      if (base.length === 0) {
        base = DIET_OPTIONS.filter((diet) =>
          diet.toLowerCase().includes(q)
        );
      }
    }

    setSuggestions(base.map((name) => ({ name })));
  }, [inputValue]);

  const selectDiet = (name: string) => {
    if (name === "Any / No preference") {
      onChange("");
      setInputValue("");
    } else {
      onChange(name);
      setInputValue(name);
    }
    setOpen(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        // pick top suggestion
        selectDiet(suggestions[0].name);
      } else {
        const q = inputValue.trim().toLowerCase();
        const match = DIET_OPTIONS.find(
          (d) => d.toLowerCase() === q
        );
        if (match) {
          selectDiet(match);
        } else {
          // fall back to "no preference"
          selectDiet("Any / No preference");
        }
      }
    }
  };

  return (
    // 👇 exact same wrapper as CuisineAutocomplete
    <div className="field-autocomplete">
      <input
        className="input field-input"
        placeholder="e.g. vegetarian, vegan"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
      />

      {open && suggestions.length > 0 && (
        // 👇 same dropdown / option classes as cuisine
        <div className="field-dropdown">
          {suggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              className="field-option"
              onMouseDown={(e) => {
                e.preventDefault(); // avoid blur-before-click
                selectDiet(s.name);
              }}
            >
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
