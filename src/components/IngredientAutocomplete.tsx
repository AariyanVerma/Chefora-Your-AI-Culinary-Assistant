"use client";

import { useEffect, useState, KeyboardEvent, ChangeEvent } from "react";

type IngredientSuggestion = {
  id: string;
  label: string;
  imageUrl: string | null;
  source?: string;
};

type Props = {
  value: string[];                 
  onChange: (next: string[]) => void;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const SPOON_KEY = process.env.NEXT_PUBLIC_SPOONACULAR_API_KEY;

async function fetchSuggestions(query: string): Promise<IngredientSuggestion[]> {
  if (!query || query.trim().length < 2) return [];

  const resolveImageUrl = (raw?: string | null) => {
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw;
    }
    
    return `https://spoonacular.com/cdn/ingredients_100x100/${raw}`;
  };

  try {
    
    const url = `${API_BASE}/api/ingredients/autocomplete?q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url);
    if (res.ok) {
      const data: any[] = await res.json();
      const hasImageField = (data || []).some(
        (item) => item.imageUrl || item.image
      );

      if (hasImageField) {
        return (data || []).map((item, idx) => ({
          id: String(item.id ?? item.name ?? item.label ?? idx),
          label: item.label ?? item.name ?? "",
          imageUrl: resolveImageUrl(item.imageUrl ?? item.image ?? null),
          source: item.source,
        }));
      }
    } else {
      console.error(
        "[IngredientAutocomplete] backend HTTP error",
        res.status
      );
    }

    if (!SPOON_KEY) {
      console.warn(
        "[IngredientAutocomplete] Missing NEXT_PUBLIC_SPOONACULAR_API_KEY; cannot fetch images."
      );
      return [];
    }

    const spoonUrl = `https:
      query.trim()
    )}`;
    const spoonRes = await fetch(spoonUrl);
    if (!spoonRes.ok) {
      console.error(
        "[IngredientAutocomplete] Spoonacular HTTP error",
        spoonRes.status
      );
      return [];
    }

    const spoonData: any[] = await spoonRes.json();
    return (spoonData || []).map((item, idx) => ({
      id: String(item.id ?? item.name ?? item.label ?? idx),
      label: item.name ?? item.label ?? "",
      imageUrl: resolveImageUrl(item.image),
      source: "spoonacular",
    }));
  } catch (err) {
    console.error("[IngredientAutocomplete] fetch failed", err);
    return [];
  }
}

export default function IngredientAutocomplete({ value, onChange }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = inputValue.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const handle = setTimeout(async () => {
      try {
        const list = await fetchSuggestions(q);
        if (!cancelled) {
          setSuggestions(list);
          setOpen(list.length > 0);
        }
      } catch (err) {
        console.error("Ingredient autocomplete failed", err);
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250); 

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [inputValue]);

  const addIngredient = (label: string) => {
    const clean = label.trim();
    if (!clean) return;
    if (value.some((v) => v.toLowerCase() === clean.toLowerCase())) {
      setInputValue("");
      return;
    }
    onChange([...value, clean]);
    setInputValue("");
    setOpen(false);
  };

  const removeIngredient = (label: string) => {
    onChange(value.filter((v) => v !== label));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addIngredient(suggestions[0].label);
      } else {
        addIngredient(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue) {
      
      if (value.length > 0) {
        onChange(value.slice(0, -1));
      }
    }
  };

  return (
    <div className="field-autocomplete ingredient-autocomplete">
      {}
      <div className="ingredient-pill glass-input">
        {value.map((ing) => (
          <span key={ing} className="ingredient-tag">
            <span className="ingredient-tag-label">{ing}</span>
            <button
              type="button"
              className="ingredient-tag-remove"
              onClick={() => removeIngredient(ing)}
              aria-label={`Remove ${ing}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          className="input field-input ingredient-input"
          placeholder={
            value.length
              ? "Add more ingredients…"
              : "Start typing an ingredient…"
          }
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          onBlur={() => {
            
            setTimeout(() => setOpen(false), 120);
          }}
        />
      </div>

      {}
      {open && suggestions.length > 0 && (
        <div className="field-dropdown">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="field-option"
              onMouseDown={(e) => {
                e.preventDefault();
                addIngredient(s.label);
              }}
            >
              {s.imageUrl && (
                <img
                  src={s.imageUrl}
                  alt={s.label}
                  className="field-thumb"
                />
              )}
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="field-loading">Searching ingredients…</div>
      )}
    </div>
  );
}
