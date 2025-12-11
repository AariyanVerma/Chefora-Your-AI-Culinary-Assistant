"use client";

import { useEffect, useState } from "react";

const SPOONACULAR_API_KEY = "9b4673bafafe4112a27269a46ed88e20";

type CuisineSuggestion = {
  name: string;
  imageUrl: string | null;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export default function CuisineAutocomplete({ value, onChange }: Props) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<CuisineSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setInputValue(value), [value]);

  useEffect(() => {
    const q = inputValue.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);

        const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(
          q
        )}&number=15&addRecipeInformation=true&apiKey=${SPOONACULAR_API_KEY}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch cuisines");
        const data = (await res.json()) as {
          results: { cuisines?: string[]; image?: string }[];
        };

        if (cancelled) return;

        const cuisineMap = new Map<string, string | null>();

        for (const r of data.results) {
          const cuisines = r.cuisines || [];
          for (const c of cuisines) {
            const name = c.trim();
            if (!name) continue;
            if (!name.toLowerCase().includes(q.toLowerCase())) continue;
            if (!cuisineMap.has(name)) {
              cuisineMap.set(name, r.image ?? null);
            }
          }
        }

        const list: CuisineSuggestion[] = Array.from(
          cuisineMap.entries()
        ).map(([name, imageUrl]) => ({ name, imageUrl }));

        setSuggestions(list);
        setOpen(list.length > 0);
      } catch (err) {
        console.error(err);
        setSuggestions([]);
        setOpen(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [inputValue]);

  function choose(s: CuisineSuggestion) {
    onChange(s.name);
    setInputValue(s.name);
    setOpen(false);
  }

  return (
    <div className="field-autocomplete">
      <input
        className="input field-input"
        placeholder="e.g. Italian, Indian"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
      />

      {open && suggestions.length > 0 && (
        <div className="field-dropdown">
          {suggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              className="field-option"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
            >
              {s.imageUrl && (
                <img
                  src={s.imageUrl}
                  alt={s.name}
                  className="field-thumb"
                />
              )}
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="field-loading">Searching cuisines…</div>
      )}
    </div>
  );
}
