/*"use client";

import { useEffect, useState } from "react";

type Suggestion = {
  name: string;
  imageUrl?: string | null;
};

type Props = {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  fetchUrl: (query: string) => string;  // API generator
  showImage?: boolean;
};

export default function GenericAutocomplete({
  placeholder,
  value,
  onChange,
  fetchUrl,
  showImage = false,
}: Props) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // keep input synced
  useEffect(() => setInputValue(value), [value]);

  // fetch suggestions
  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const url = fetchUrl(inputValue);

        const res = await fetch(url);
        const data = await res.json();

        if (cancelled) return;

        setSuggestions(data);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [inputValue]);

  function choose(value: string) {
    onChange(value);
    setInputValue(value);
    setOpen(false);
  }

  return (
    <div className="generic-autocomplete">
      <input
        className="input generic-input"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />

      {open && suggestions.length > 0 && (
        <div className="generic-dropdown">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="generic-option"
              onMouseDown={() => choose(s.name)}
            >
              {showImage && s.imageUrl && (
                <img className="generic-thumb" src={s.imageUrl} />
              )}
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}

      {loading && <div className="generic-loading">Loading…</div>}
    </div>
  );
}
*/