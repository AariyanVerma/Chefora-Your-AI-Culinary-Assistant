"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import IngredientAutocomplete from "@/components/IngredientAutocomplete";
import DietAutocomplete from "@/components/DietAutocomplete";
import CuisineAutocomplete from "@/components/CuisineAutocomplete";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const resolveRecipeImage = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
};

type AiRecipe = {
  recipeId: string;
  title: string;
  summary?: string;
  imageUrl?: string | null;
  estimatedTimeMinutes?: number | null;
  servings?: number | null;
  diet?: string | null;
  ingredients?: { name: string; quantity: string }[];
  steps?: string[];
};

type SearchResult = {
  recipeId: string;
  title: string;
  thumbnailUrl?: string | null;
  estimatedTimeMinutes?: number | null;
  diet?: string | null;
  rating?: number | null;
};

type StrictMatch = {
  id: string;
  title: string;
  imageUrl: string | null;
  source: string;
  totalTimeMinutes: number | null;
  dietLabels: string[];
  cuisines: string[];
  ingredientsUsed: string[];
  ingredientsMissing: string[];
  sourceUrl?: string;

  steps?: string[];
  tips?: string[];
  servings?: number | null;
  description?: string;
};

type AiIdea = {
  title: string;
  description?: string;
  estimatedTimeMinutes: number | null;
  diet?: string | null;
  cuisine?: string | null;
  imageUrl?: string | null;
  ingredientsUsed: string[];
  ingredientsMissing: string[];
  steps: string[];
  tips?: string[];
};

type DrawerMode = "aiMatch" | "aiIdea" | "search" | null;

function useMedia(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export default function Page() {
  const isCompact = useMedia("(max-width: 560px)");
  const pathname = usePathname();
  const [tab, setTab] = useState<"browse" | "search" | "special">("browse");

  const [aiIngredients, setAiIngredients] = useState<string[]>([]);
  const [aiDiet, setAiDiet] = useState("");
  const [aiCuisine, setAiCuisine] = useState("");
  const [aiTime, setAiTime] = useState<number | "">("");
  const [aiServings, setAiServings] = useState<number | "">("");
  const [aiMood, setAiMood] = useState("");

  const [aiStrictMatches, setAiStrictMatches] = useState<StrictMatch[]>([]);
  const [aiIdeasList, setAiIdeasList] = useState<AiIdea[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHasRun, setAiHasRun] = useState(false);
  const [showAiAdvanced, setShowAiAdvanced] = useState(false);

  const [selectedMatch, setSelectedMatch] = useState<StrictMatch | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<AiIdea | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [dietFilter, setDietFilter] = useState("");
  const [maxTimeFilter, setMaxTimeFilter] = useState<number | "">("");
  const [showSearchAdvanced, setShowSearchAdvanced] = useState(false);

  const [selectedRecipe, setSelectedRecipe] = useState<AiRecipe | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [checkedIngredients, setCheckedIngredients] =
    useState<Record<string, boolean>>({});

  const ingredientListRef = useRef<HTMLUListElement | null>(null);
  const [ingredientOrders, setIngredientOrders] = useState<number[]>([]);

  useEffect(() => {
    
    if (drawerMode === "search" && selectedRecipe?.recipeId) {
      setCheckedIngredients({});
    }
  }, [drawerMode, selectedRecipe?.recipeId]);

  useEffect(() => {
  
  if (drawerMode === "aiMatch" && selectedMatch) {
    setCheckedIngredients({});
  }
}, [drawerMode, selectedMatch]);

  useEffect(() => {
    function packIngredients() {
      const container = ingredientListRef.current;
      if (!container) return;

      const items = Array.from(container.children) as HTMLElement[];
      if (!items.length) {
        setIngredientOrders([]);
        return;
      }
      
      const totalWidth = container.offsetWidth;
      if (!totalWidth) return;

      const gap = 12; 

      const widths = items.map((el) => el.offsetWidth + gap);

      const rows: number[][] = [];
      let currentRow: number[] = [];
      let currentWidth = 0;

      widths.forEach((w, index) => {
        if (currentWidth + w > totalWidth && currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
          currentWidth = 0;
        }
        currentRow.push(index);
        currentWidth += w;
      });

      if (currentRow.length) rows.push(currentRow);

      setIngredientOrders(rows.flat());
    }

    packIngredients();
    window.addEventListener("resize", packIngredients);
    return () => window.removeEventListener("resize", packIngredients);
  }, [drawerMode, selectedRecipe?.recipeId, selectedRecipe?.ingredients?.length]);

  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => {
      const s = Math.max(
        0,
        Math.min(
          1,
          window.scrollY /
            (document.body.scrollHeight - window.innerHeight || 1)
        )
      );
      root.style.setProperty("--scroll", s.toString());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const setVH = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };
    setVH();
    window.addEventListener("resize", setVH);
    return () => window.removeEventListener("resize", setVH);
  }, []);

  const {
    data: searchData,
    isFetching: searchLoading,
    refetch: runSearch,
  } = useQuery({
    queryKey: ["spoonSearch", searchTerm, dietFilter, maxTimeFilter],
    enabled: false,
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (searchTerm) params.set("query", searchTerm);
      if (dietFilter) params.set("diet", dietFilter);
      if (maxTimeFilter) params.set("maxTimeMinutes", String(maxTimeFilter));

      const url = `${API_BASE}/api/recipes/search?${params.toString()}`;
      console.log("[Search] GET", url);

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[Search] error response:", res.status, text);
        throw new Error("Failed to search recipes");
      }
      const j = await res.json();
      console.log("[Search] result:", j);
      return j as {
        page: number;
        pageSize: number;
        totalResults: number;
        results: SearchResult[];
      };
    },
  });

  async function fetchDetails(id: string) {
    try {
      setDetailsLoading(true);
      setSelectedRecipe(null);
      setDrawerMode("search");

      const url = `${API_BASE}/api/recipes/${id}`;
      console.log("[Details] GET", url);

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[Details] error:", res.status, text);
        throw new Error("Failed to load recipe details");
      }
      const j = (await res.json()) as AiRecipe;
      console.log("[Details] result:", j);
      setSelectedRecipe(j);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleAiSuggest() {
    setAiError(null);
    setAiHasRun(true);
    setSelectedRecipe(null);
    setSelectedMatch(null);
    setSelectedIdea(null);
    setAiStrictMatches([]);
    setAiIdeasList([]);

    if (
      aiIngredients.length === 0 &&
      !aiDiet &&
      !aiCuisine &&
      !aiTime &&
      !aiMood
    ) {
      setAiError("Please add at least one ingredient or preference.");
      return;
    }

    try {
      setAiLoading(true);

      const body = {
        ingredients: aiIngredients,
        diet: aiDiet || undefined,
        cuisine: aiCuisine || undefined,
        maxTimeMinutes: aiTime || undefined,
        servings: aiServings || undefined,
        mood: aiMood || undefined,
      };

      const url = `${API_BASE}/api/recipes/ai-suggest`;
      console.log("[AI] POST", url, "body:", body);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[AI] error response:", res.status, text);
        let message = "Failed to generate AI recipes";
        try {
          const json = JSON.parse(text);
          if (json?.error) message = json.error;
        } catch {
          
        }
        throw new Error(message);
      }

      const j = (await res.json()) as {
        searchMatches?: Partial<StrictMatch>[];
        aiIdeas?: Partial<AiIdea>[];
      };
      console.log("[AI] result:", j);

      const matches: StrictMatch[] = (j.searchMatches || []).map((m: any) => ({
        id: String(m.id ?? ""),
        title: m.title ?? "Untitled recipe",
        imageUrl: resolveRecipeImage(
          m.imageUrl ??
            m.image ??
            m.image_url ??
            m.thumbnail ??
            m.thumb ??
            null
        ),
        source: m.source ?? "unknown",
        totalTimeMinutes:
          typeof m.totalTimeMinutes === "number"
            ? m.totalTimeMinutes
            : null,
        dietLabels: Array.isArray(m.dietLabels) ? m.dietLabels : [],
        cuisines: Array.isArray(m.cuisines) ? m.cuisines : [],
        ingredientsUsed: Array.isArray(m.ingredientsUsed)
          ? m.ingredientsUsed
          : [],
        ingredientsMissing: Array.isArray(m.ingredientsMissing)
          ? m.ingredientsMissing
          : [],
        sourceUrl: m.sourceUrl,
        steps: Array.isArray(m.steps) ? m.steps : [],
        tips: Array.isArray(m.tips) ? m.tips : [],
        servings: typeof m.servings === "number" ? m.servings : null,
        description: m.description ?? "",
      }));

      const ideas: AiIdea[] = (j.aiIdeas || []).map((idea: any) => ({
        title: idea.title ?? "Untitled idea",
        description: idea.description ?? "",
        estimatedTimeMinutes:
          typeof idea.estimatedTimeMinutes === "number"
            ? idea.estimatedTimeMinutes
            : null,
        diet: idea.diet ?? null,
        cuisine: idea.cuisine ?? null,
        imageUrl: resolveRecipeImage(
          idea.imageUrl ??
            idea.image ??
            idea.image_url ??
            idea.thumbnail ??
            idea.thumb ??
            null
        ),
        ingredientsUsed: Array.isArray(idea.usesYourIngredients)
          ? idea.usesYourIngredients
          : [],
        ingredientsMissing: Array.isArray(idea.youMayNeedToBuy)
          ? idea.youMayNeedToBuy
          : [],
        steps: Array.isArray(idea.steps) ? idea.steps : [],
        tips: Array.isArray(idea.tips) ? idea.tips : [],
      }));

      console.log("[AI] mapped matches:", matches);
      console.log("[AI] mapped ideas:", ideas);

      setAiStrictMatches(matches);
      setAiIdeasList(ideas);

      if (matches.length > 0) {
        setSelectedMatch(matches[0]);
        setDrawerMode("aiMatch");
      } else if (ideas.length > 0) {
        setSelectedIdea(ideas[0]);
        setDrawerMode("aiIdea");
      } else {
        setDrawerMode(null);
      }
    } catch (err: any) {
      console.error("[AI] exception:", err);
      setAiError(err?.message || "Something went wrong");
    } finally {
      setAiLoading(false);
    }
  }

  const isDrawerOpen =
    drawerMode === "aiMatch"
      ? !!selectedMatch
      : drawerMode === "aiIdea"
      ? !!selectedIdea
      : drawerMode === "search"
      ? detailsLoading || !!selectedRecipe
      : false;

  const mainMatch = aiStrictMatches[0] ?? null;
  const suggestionMatches =
    aiStrictMatches.length > 1 ? aiStrictMatches.slice(1) : [];

  return (
    <>
      {}
      <div className="bg-base" aria-hidden />
      <div className="bg-anim" aria-hidden>
        {}
        <span
          className="bubble b-pink"
          style={
            { "--sz": "520px", "--x": "10%", "--y": "-6%", "--d": "18s" } as any
          }
        />
        <span
          className="bubble b-blue"
          style={
            { "--sz": "620px", "--x": "82%", "--y": "-12%", "--d": "22s" } as any
          }
        />
        <span
          className="bubble b-green"
          style={
            { "--sz": "460px", "--x": "14%", "--y": "76%", "--d": "20s" } as any
          }
        />
        <span
          className="bubble b-neon"
          style={
            { "--sz": "540px", "--x": "86%", "--y": "78%", "--d": "19s" } as any
          }
        />
        <span
          className="bubble b-purple"
          style={
            { "--sz": "360px", "--x": "48%", "--y": "16%", "--d": "16s" } as any
          }
        />
        <span
          className="bubble b-amber"
          style={
            { "--sz": "320px", "--x": "58%", "--y": "54%", "--d": "21s" } as any
          }
        />
        <span
          className="bubble b-cyan"
          style={
            { "--sz": "340px", "--x": "30%", "--y": "52%", "--d": "17s" } as any
          }
        />
        <span
          className="bubble b-magenta"
          style={
            { "--sz": "300px", "--x": "72%", "--y": "32%", "--d": "15s" } as any
          }
        />
        <span
          className="bubble b-lime"
          style={
            { "--sz": "220px", "--x": "22%", "--y": "28%", "--d": "12s" } as any
          }
        />
        <span
          className="bubble b-orange"
          style={
            { "--sz": "200px", "--x": "74%", "--y": "88%", "--d": "11s" } as any
          }
        />
        <span
          className="bubble b-cyan"
          style={
            { "--sz": "180px", "--x": "38%", "--y": "84%", "--d": "13s" } as any
          }
        />
      </div>

      {}
      <header
        className="glass ios solid header header-anim layer-content"
        role="banner"
        style={{
          gap: 8,
          alignItems: "center",
          zIndex: 3000,
          position: "fixed",
          top: 20,
          left: 0,
          right: 0,
          width: "90%",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          animation: isCompact ? ("none" as any) : undefined,
          willChange: isCompact ? "auto" : "transform",
          pointerEvents: "auto",
        }}
      >
        {!isCompact && (
          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              className="title"
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Chefora – Your Personal AI Culinary Assistant
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
        >
          <Link
            href="/dashboard"
            style={{ display: "block" }}
          >
            <img
              src="/assets/chefora-logo.svg"
              alt="Chefora"
              style={{
                width: isCompact ? 56 : 72,
                height: isCompact ? 56 : 70,
                objectFit: "contain",
                display: "block",
                cursor: "pointer",
                filter: "saturate(3.0) contrast(2.5) brightness(1.3)",
              }}
            />
          </Link>
        </div>

        {!isCompact ? (
          <div
            className="tabs"
            role="tablist"
            aria-label="Primary"
            style={{ display: "flex", gap: 8, marginLeft: "auto" }}
          >
            <Link
              href="/"
              className={`tab tap-ripple ${pathname === "/" ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
                padding: "10px 14px",
                textDecoration: "none",
              }}
            >
              🍽️ <span style={{ marginLeft: 6 }}>Browse</span>
            </Link>

            <Link
              href="/"
              className={`tab tap-ripple ${pathname === "/" ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
                padding: "10px 14px",
                textDecoration: "none",
              }}
            >
              🔎 <span style={{ marginLeft: 6 }}>Search</span>
            </Link>

            <Link
              href="/"
              className={`tab tap-ripple ${pathname === "/" ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
                padding: "10px 14px",
                textDecoration: "none",
              }}
            >
              👨‍🍳 <span style={{ marginLeft: 6 }}>Chef's Special</span>
            </Link>

            <Link
              href="/ai-recipes"
              className={`tab tap-ripple ${pathname === "/ai-recipes" ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
                padding: "10px 14px",
                textDecoration: "none",
              }}
            >
              🤖 <span style={{ marginLeft: 6 }}>AI Recipes</span>
            </Link>
          </div>
        ) : (
          <>
            <div
              style={{
                position: "absolute",
                left: "25%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Chefora
            </div>

            <div
              style={{
                marginLeft: "auto",
                position: "relative",
                zIndex: 3001,
                pointerEvents: "auto",
              }}
            >
              <label
                htmlFor="navSelect"
                className="subtitle"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clip: "rect(1px,1px,1px,1px)",
                }}
              >
                Navigate
              </label>
              <select
                id="navSelect"
                value={tab}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "ai") {
                    window.location.href = "/ai-recipes";
                  } else {
                    setTab(v as any);
                  }
                }}
                style={{
                  background: "rgba(0,0,0,.15)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  fontWeight: 700,
                  WebkitAppearance: "none",
                  appearance: "auto",
                  position: "relative",
                }}
              >
                <option value="browse">Browse</option>
                <option value="search">Search</option>
                <option value="special">Chef’s Special</option>
                <option value="ai">AI Recipes</option>
              </select>
            </div>
          </>
        )}
      </header>

      {}
      <main className="container layer-content ai-page-main">
        {}
        <section className="glass ios solid hero ai-hero">
          <div className="ai-section-header">
            <div className="sectionTitle ai-section-title">
              AI Recipe Suggestion
            </div>
          </div>

          <div className="ai-ai-form ai-form-layout">
            {}
            <div className="ai-form-section">
              <label className="ai-field-label">Ingredients</label>
              <p className="ai-helper-text">
                Start typing an ingredient and select from suggestions. Each
                selection becomes a tag.
              </p>
              <IngredientAutocomplete
                value={aiIngredients}
                onChange={setAiIngredients}
              />
            </div>

            {}
            <div className="ai-form-section">
              <div className="ai-form-section-heading">
                <span className="ai-field-label">Preferences (optional)</span>
              </div>
              <div className="ai-form-grid">
                <div className="ai-field-group">
                  <label className="ai-field-label-sub">Diet</label>
                  <DietAutocomplete value={aiDiet} onChange={setAiDiet} />
                </div>
                <div className="ai-field-group">
                  <label className="ai-field-label-sub">Cuisine</label>
                  <CuisineAutocomplete
                    value={aiCuisine}
                    onChange={setAiCuisine}
                  />
                </div>
              </div>
            </div>

            {}
            <div className="ai-form-advanced-row">
              <button
                type="button"
                className={`ai-advanced-toggle ${
                  showAiAdvanced ? "ai-advanced-toggle--active" : ""
                }`}
                onClick={() => setShowAiAdvanced((prev) => !prev)}
              >
                {showAiAdvanced ? "Hide more options" : "More options"}
              </button>
            </div>

            {}
            {showAiAdvanced && (
              <div className="ai-form-section ai-form-section--compact">
                <div className="ai-form-grid">
                  <div className="ai-field-group">
                    <label className="ai-field-label-sub">
                      Max time (mins)
                    </label>
                    <input
                      className="input ai-plain-input"
                      placeholder="e.g. 30"
                      value={aiTime}
                      onChange={(e) =>
                        setAiTime(
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value) || ""
                        )
                      }
                    />
                  </div>
                  <div className="ai-field-group">
                    <label className="ai-field-label-sub">Servings</label>
                    <input
                      className="input ai-plain-input"
                      placeholder="e.g. 2"
                      value={aiServings}
                      onChange={(e) =>
                        setAiServings(
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value) || ""
                        )
                      }
                    />
                  </div>
                </div>

                <div className="ai-field-group ai-field-group--stack">
                  <label className="ai-field-label-sub">
                    Mood / style (optional)
                  </label>
                  <input
                    className="input ai-plain-input"
                    placeholder="e.g. comfort food, light, party"
                    value={aiMood}
                    onChange={(e) => setAiMood(e.target.value)}
                  />
                </div>
              </div>
            )}

            {}
            <div className="ai-form-actions">
              <button
                className="btn ghost tap-ripple"
                type="button"
                onClick={() => {
                  setAiIngredients([]);
                  setAiDiet("");
                  setAiCuisine("");
                  setAiTime("");
                  setAiServings("");
                  setAiMood("");
                  setAiError(null);
                  setAiStrictMatches([]);
                  setAiIdeasList([]);
                  setSelectedMatch(null);
                  setSelectedIdea(null);
                  setDrawerMode(null);
                  setShowAiAdvanced(false);
                  setAiHasRun(false);
                }}
              >
                Reset
              </button>
              <button
                className="btn tap-ripple"
                type="button"
                onClick={handleAiSuggest}
                disabled={aiLoading}
              >
                {aiLoading ? "Cooking..." : "Generate Recipes"}
              </button>
            </div>

            {}
            {aiLoading && (
              <div className="subtitle ai-status-text">
                Searching for recipes that match your constraints…
              </div>
            )}
            {aiError && (
              <div className="subtitle ai-error-text">{aiError}</div>
            )}

            {}
            {aiHasRun &&
              !aiLoading &&
              !aiError &&
              aiStrictMatches.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div className="ai-section-header">
                    <div className="sectionTitle">Strict matches</div>
                  </div>

                  {}
                  {mainMatch && (
                    <div className="ai-main-match-card">
                      <div
                        className="ai-section-header"
                        style={{ marginBottom: 12 }}
                      >
                        <div className="sectionTitle">Top match</div>
                      </div>

                      <div className="glass card card-mount ai-search-card ai-search-card--main">
                        <button
                          className="tap-ripple ai-search-card-button"
                          type="button"
                          onClick={() => {
                            setSelectedMatch(mainMatch);
                            setDrawerMode("aiMatch");
                          }}
                        >
                          {mainMatch.imageUrl && (
                            <img
                              className="img-fade ai-search-card-image"
                              src={mainMatch.imageUrl}
                              alt={mainMatch.title}
                            />
                          )}
                          <div className="cardBody">
                            <div className="cardTitle">
                              {mainMatch.title}
                              <span className="ai-main-pill">Top pick</span>
                            </div>
                            <div className="subtitle ai-search-card-meta">
                              {mainMatch.totalTimeMinutes
                                ? `~${mainMatch.totalTimeMinutes} mins`
                                : "Time N/A"}{" "}
                              • {mainMatch.source || "Recipe"}
                            </div>
                            {mainMatch.ingredientsUsed?.length > 0 && (
                              <div className="subtitle">
                                Uses:{" "}
                                {mainMatch.ingredientsUsed.join(", ")}
                              </div>
                            )}
                            {mainMatch.ingredientsMissing?.length > 0 && (
                              <div className="subtitle">
                                You may need:{" "}
                                {mainMatch.ingredientsMissing.join(", ")}
                              </div>
                            )}
                            <div className="cardLink">View full recipe</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {}
                  {suggestionMatches.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div
                        className="ai-section-header"
                        style={{ marginBottom: 10 }}
                      >
                        <div className="sectionTitle">
                          Other strong matches
                        </div>
                        <p className="ai-section-subtitle">
                          These also respect your diet and use some of your
                          ingredients.
                        </p>
                      </div>

                      <div className="grid">
                        {suggestionMatches.map((m) => {
                          const used = m.ingredientsUsed ?? [];
                          const missing = m.ingredientsMissing ?? [];

                          return (
                            <div
                              key={m.id}
                              className="glass card card-mount ai-search-card"
                            >
                              <button
                                className="tap-ripple ai-search-card-button"
                                type="button"
                                onClick={() => {
                                  setSelectedMatch(m);
                                  setDrawerMode("aiMatch");
                                }}
                              >
                                {m.imageUrl && (
                                  <img
                                    className="img-fade ai-search-card-image"
                                    src={m.imageUrl}
                                    alt={m.title}
                                  />
                                )}
                                <div className="cardBody">
                                  <div className="cardTitle">
                                    {m.title}
                                  </div>
                                  <div className="subtitle ai-search-card-meta">
                                    {m.totalTimeMinutes
                                      ? `~${m.totalTimeMinutes} mins`
                                      : "Time N/A"}{" "}
                                    • {m.source || "Recipe"}
                                  </div>
                                  {used.length > 0 && (
                                    <div className="subtitle">
                                      Uses: {used.join(", ")}
                                    </div>
                                  )}
                                  {missing.length > 0 && (
                                    <div className="subtitle">
                                      May need: {missing.join(", ")}
                                    </div>
                                  )}
                                  <div className="cardLink">
                                    View details
                                  </div>
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        </section>

        {}
        <section className="ai-search-section">
          <div className="ai-section-header">
            <div className="sectionTitle">Search Recipes (Spoonacular)</div>
          </div>

          <div className="glass ios solid hero ai-search-hero">
            <div className="ai-search-form">
              {}
              <div className="ai-form-section">
                <label className="ai-field-label">Search</label>
                <p className="ai-helper-text">
                  For example:
                  <span className="ai-helper-inline">
                    {" "}
                    pasta, salad, burger
                  </span>
                </p>
                <div className="inputIcon ai-search-main-input">
                  <i>🔎</i>
                  <input
                    className="input"
                    placeholder="Search recipes…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  />
                </div>
              </div>

              {}
              <div className="ai-search-actions-row">
                <button
                  className="btn tap-ripple"
                  type="button"
                  onClick={() => runSearch()}
                  disabled={searchLoading}
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
                <button
                  type="button"
                  className={`ai-advanced-toggle ai-advanced-toggle--inline ${
                    showSearchAdvanced ? "ai-advanced-toggle--active" : ""
                  }`}
                  onClick={() => setShowSearchAdvanced((prev) => !prev)}
                >
                  {showSearchAdvanced ? "Hide filters" : "Filters"}
                </button>
              </div>

              {}
              {showSearchAdvanced && (
                <div className="ai-form-section ai-form-section--compact ai-search-filters">
                  <div className="ai-form-grid">
                    <div className="ai-field-group">
                      <label className="ai-field-label-sub">
                        Diet (optional)
                      </label>
                      <input
                        className="input ai-plain-input ai-search-filter"
                        placeholder="e.g. vegetarian"
                        value={dietFilter}
                        onChange={(e) => setDietFilter(e.target.value)}
                      />
                    </div>
                    <div className="ai-field-group">
                      <label className="ai-field-label-sub">
                        Max time (mins)
                      </label>
                      <input
                        className="input ai-plain-input ai-search-filter"
                        placeholder="e.g. 30"
                        value={maxTimeFilter}
                        onChange={(e) =>
                          setMaxTimeFilter(
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value) || ""
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {searchLoading && (
            <div className="ai-search-skeleton">
              <SkeletonGrid />
            </div>
          )}

          {Array.isArray(searchData?.results) &&
            searchData.results.length > 0 && (
              <>
                <div className="subtitle ai-search-summary">
                  Showing {searchData.results.length} of{" "}
                  {searchData.totalResults ?? searchData.results.length} results.
                </div>
                <div className="grid">
                  {searchData.results.map((r) => (
                    <div
                      key={r.recipeId}
                      className="glass card card-mount ai-search-card"
                    >
                      <button
                        className="tap-ripple ai-search-card-button"
                        type="button"
                        onClick={() => fetchDetails(r.recipeId)}
                      >
                        {r.thumbnailUrl && (
                          <img
                            className="img-fade ai-search-card-image"
                            src={r.thumbnailUrl}
                            alt={r.title}
                          />
                        )}
                        <div className="cardBody">
                          <div className="cardTitle">{r.title}</div>
                          <div className="subtitle ai-search-card-meta">
                            {r.estimatedTimeMinutes
                              ? `~${r.estimatedTimeMinutes} mins`
                              : "Time N/A"}{" "}
                            • {r.diet || "Spoonacular"}
                          </div>
                          {typeof r.rating === "number" && (
                            <div className="subtitle">
                              Rated {r.rating.toFixed(1)}/5
                            </div>
                          )}
                          <div className="cardLink">View details</div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
        </section>
      </main>

      {}
      <Drawer open={isDrawerOpen} onClose={() => setDrawerMode(null)}>

  {}
{drawerMode === "aiMatch" && selectedMatch && (
  <div
    className="glass surface hero ai-result-layout"
    style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",      
      maxWidth: 960,      
      margin: "0 auto",   
      padding: 24,        
      flex: 1,            
      minHeight: "100%",  
      boxSizing: "border-box", 
      gap: 24,            
    }}
  >
      {}
      <div className="ai-result-left" style={{ flex: "3 1 0", minWidth: 0 }}>
        
        {}
        <div style={{ marginBottom: 12 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            AI crafted match
          </p>
          <h2 className="ai-result-title" style={{ marginTop: 4 }}>
            {selectedMatch.title}
          </h2>
        </div>

        {}
        {selectedMatch.imageUrl && (
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow:
                  "0 0 40px rgba(255,255,255,0.12), 0 0 80px rgba(140,90,255,0.12)",
                maxWidth: "100%",
              }}
            >
              <img
                src={selectedMatch.imageUrl}
                alt={selectedMatch.title}
                className="ai-result-hero-img"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  height: "auto",
                }}
              />
            </div>
          </div>
        )}

        {}
        {Array.isArray(selectedMatch.ingredientsUsed) &&
          selectedMatch.ingredientsUsed.length > 0 && (
            <section style={{ marginBottom: 14 }}>
              <h3 className="ai-result-subtitle">Uses your ingredients</h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {selectedMatch.ingredientsUsed.map((ing, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      background: "rgba(34,197,94,0.14)",
                      border: "1px solid rgba(34,197,94,0.5)",
                      fontSize: 12,
                    }}
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </section>
          )}

        {}
{selectedMatch.ingredientsMissing.length > 0 && (
  <section style={{ marginBottom: 14 }}>
    <h3 className="ai-result-subtitle">You may need to buy</h3>

    <ul
      className="ingredient-list ai-result-list"
      style={{ paddingLeft: 0, marginTop: 12 }}
      ref={ingredientListRef}
    >
      {selectedMatch.ingredientsMissing.map((ing, i) => {
        const id = `ai-missing-${i}-${ing}`;
        const label = ing;
        const checked = !!checkedIngredients[id];
        const visualOrder = ingredientOrders[i] ?? i;

        return (
          <li
            key={id}
            className="ingredient-pill"
            style={{ order: visualOrder }}
          >
            <button
              type="button"
              className={
                "ingredient-pill-inner" + (checked ? " is-checked" : "")
              }
              onClick={() =>
                setCheckedIngredients((prev) => ({
                  ...prev,
                  [id]: !checked,
                }))
              }
            >
              <span className="ingredient-pill-dot" />
              <span className="ingredient-pill-text">{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </section>
)}

        {}
        {selectedMatch.description && (
          <p
            className="ai-result-summary"
            style={{
              marginTop: 4,
              marginBottom: 10,
              opacity: 0.9,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {selectedMatch.description}
          </p>
        )}

        {}
        {selectedMatch.steps && selectedMatch.steps.length > 0 && (
          <section style={{ marginTop: 8 }}>
            <h3 className="ai-result-subtitle">Step-by-step instructions</h3>
            <ol
              className="ai-result-steps"
              style={{
                listStyle: "none",
                padding: 0,
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {selectedMatch.steps.map((step, i) => (
                <li
                  key={i}
                  className="ai-result-step"
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {step}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {}
        {selectedMatch.tips && selectedMatch.tips.length > 0 && (
          <section style={{ marginTop: 14 }}>
            <h3 className="ai-result-subtitle">Tips &amp; tricks</h3>
            <ul
              className="ai-result-list"
              style={{ marginTop: 6, paddingLeft: 16 }}
            >
              {selectedMatch.tips.map((tip, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {selectedMatch.sourceUrl && (
          <a
            href={selectedMatch.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="cardLink"
            style={{
              marginTop: 14,
              display: "inline-block",
              fontSize: 14,
            }}
          >
            View full recipe on source site ↗
          </a>
        )}
      </div>
    </div>
  )}

        {}
        {drawerMode === "aiIdea" && selectedIdea && (
          <div
            className="glass surface hero ai-result-layout"
            style={{
              flex: 1,
              minHeight: "100%",
              display: "flex",
              flexDirection: "row",
              gap: 24,
            }}
          >
            <div className="ai-result-left">
              <h2 className="ai-result-title">{selectedIdea.title}</h2>
              <p className="meta-row">
                <b>Time:</b>{" "}
                {selectedIdea.estimatedTimeMinutes
                  ? `~${selectedIdea.estimatedTimeMinutes} mins`
                  : "N/A"}
              </p>
              {selectedIdea.description && (
                <p className="ai-result-summary">{selectedIdea.description}</p>
              )}

              {selectedIdea.ingredientsUsed.length > 0 && (
                <>
                  <h3 className="ai-result-subtitle">Uses</h3>
                  <ul className="ai-result-list">
                    {selectedIdea.ingredientsUsed.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </>
              )}

              {selectedIdea.ingredientsMissing.length > 0 && (
                <>
                  <h3 className="ai-result-subtitle">You may need</h3>
                  <ul className="ai-result-list">
                    {selectedIdea.ingredientsMissing.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="ai-result-right">
              {selectedIdea.imageUrl && (
                <img
                  src={selectedIdea.imageUrl}
                  alt={selectedIdea.title}
                  className="img-fade ai-result-image"
                />
              )}

              {selectedIdea.steps && selectedIdea.steps.length > 0 && (
                <>
                  <h3 className="ai-result-subtitle">Idea steps</h3>
                  <ol className="ai-result-steps">
                    {selectedIdea.steps.map((s, i) => (
                      <li key={i} className="ai-result-step">
                        {s}
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </div>
        )}

        {}
        {drawerMode === "search" && (
          <>
            {detailsLoading && !selectedRecipe && <SkeletonCard />}

            {selectedRecipe && !detailsLoading && (
              <div
                className="glass surface hero ai-result-layout"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  maxWidth: 960,
                  margin: "0 auto",
                  padding: 24,
                  flex: 1, 
                  minHeight: "100%", 
                  boxSizing: "border-box",
                }}
              >
                {}
                <p
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    opacity: 0.7,
                    marginBottom: 6,
                  }}
                >
                  Spoonacular match
                </p>

                {}
                <h2
                  className="ai-result-title"
                  style={{ marginBottom: 16, lineHeight: 1.2 }}
                >
                  {selectedRecipe.title}
                </h2>

                {}
                {selectedRecipe.imageUrl && (
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 24,
                        padding: 0,
                        background: "rgba(255, 255, 255, 0.05)",
                        boxShadow:
                          "0 0 40px rgba(255, 255, 255, 0.15), 0 0 80px rgba(140, 90, 255, 0.1)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        overflow: "hidden",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <img
                        src={selectedRecipe.imageUrl}
                        alt={selectedRecipe.title}
                        style={{
                          maxWidth: "100%",
                          height: "auto",
                          display: "block",
                          borderRadius: 24,
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                )}

                {}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: "rgba(0,0,0,0.4)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    ⏱{" "}
                    {selectedRecipe.estimatedTimeMinutes
                      ? `~${selectedRecipe.estimatedTimeMinutes} mins`
                      : "Time N/A"}
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.6)",
                      background: "rgba(15,23,42,0.7)",
                      fontSize: 12,
                    }}
                  >
                    Servings: {selectedRecipe.servings ?? "N/A"}
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(45,212,191,0.6)",
                      background: "rgba(34,197,94,0.16)",
                      fontSize: 12,
                    }}
                  >
                    {selectedRecipe.diet ?? "Diet not specified"}
                  </span>
                </div>

                {}
                {Array.isArray(selectedRecipe.ingredients) &&
                  selectedRecipe.ingredients.length > 0 && (
                    <section style={{ marginBottom: 24 }}>
                      <h3 className="ai-result-subtitle">Ingredients</h3>

                      <ul
                        className="ingredient-list"
                        style={{ paddingLeft: 0, marginTop: 12 }}
                        ref={ingredientListRef}
                      >
                        {selectedRecipe.ingredients.map((ing, i) => {
                          const id = `${
                            selectedRecipe.recipeId ?? "recipe"
                          }-ing-${i}`;
                          const label = `${ing.quantity} – ${ing.name}`;
                          const checked = !!checkedIngredients[id];
                          const visualOrder =
                            ingredientOrders[i] ?? i;

                          return (
                            <li
                              key={id}
                              className="ingredient-pill"
                              style={{ order: visualOrder }}
                            >
                              <button
                                type="button"
                                className={
                                  "ingredient-pill-inner" +
                                  (checked ? " is-checked" : "")
                                }
                                onClick={() =>
                                  setCheckedIngredients((prev) => ({
                                    ...prev,
                                    [id]: !checked,
                                  }))
                                }
                              >
                                <span className="ingredient-pill-dot" />
                                <span className="ingredient-pill-text">
                                  {label}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}

                {}
                {selectedRecipe.steps && selectedRecipe.steps.length > 0 && (
                  <section>
                    <h3 className="ai-result-subtitle">Instructions</h3>
                    <ol
                      className="ai-result-steps"
                      style={{
                        listStyle: "none",
                        padding: 0,
                        marginTop: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {selectedRecipe.steps.map((s, i) => (
                        <li
                          key={i}
                          className="ai-result-step"
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              flexShrink: 0,
                              width: 24,
                              height: 24,
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.4)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {i + 1}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              lineHeight: 1.6,
                            }}
                          >
                            {s}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass ai-skeleton-card">
      <div className="skeleton ai-skeleton-image" />
      <div className="ai-skeleton-body">
        <div className="skeleton ai-skeleton-line" />
      </div>
    </div>
  );
}

function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="ai-drawer-root">
      <div className="ai-drawer-backdrop" onClick={onClose} />

      <div
        className="glass ios solid ai-drawer-panel"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(960px, 92vw)",
          height: "95vh", 
          maxHeight: "95vh",
          borderRadius: 28,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden", 
        }}
      >
        {}
        <div className="drawer-bg-base" aria-hidden />
        <div className="drawer-bg-anim" aria-hidden>
          <span
            className="bubble b-pink"
            style={
              { "--sz": "520px", "--x": "10%", "--y": "-6%", "--d": "18s" } as any
            }
          />
          <span
            className="bubble b-blue"
            style={
              { "--sz": "620px", "--x": "82%", "--y": "-12%", "--d": "22s" } as any
            }
          />
          <span
            className="bubble b-green"
            style={
              { "--sz": "460px", "--x": "14%", "--y": "76%", "--d": "20s" } as any
            }
          />
          <span
            className="bubble b-neon"
            style={
              { "--sz": "540px", "--x": "86%", "--y": "78%", "--d": "19s" } as any
            }
          />
          <span
            className="bubble b-purple"
            style={
              { "--sz": "360px", "--x": "48%", "--y": "16%", "--d": "16s" } as any
            }
          />
          <span
            className="bubble b-amber"
            style={
              { "--sz": "320px", "--x": "58%", "--y": "54%", "--d": "21s" } as any
            }
          />
          <span
            className="bubble b-cyan"
            style={
              { "--sz": "340px", "--x": "30%", "--y": "52%", "--d": "17s" } as any
            }
          />
          <span
            className="bubble b-magenta"
            style={
              { "--sz": "300px", "--x": "72%", "--y": "32%", "--d": "15s" } as any
            }
          />
          <span
            className="bubble b-lime"
            style={
              { "--sz": "220px", "--x": "22%", "--y": "28%", "--d": "12s" } as any
            }
          />
          <span
            className="bubble b-orange"
            style={
              { "--sz": "200px", "--x": "74%", "--y": "88%", "--d": "11s" } as any
            }
          />
          <span
            className="bubble b-cyan"
            style={
              { "--sz": "180px", "--x": "38%", "--y": "84%", "--d": "13s" } as any
            }
          />
        </div>

        {}
        <button
          onClick={onClose}
          aria-label="Close"
          className="tap-ripple ai-drawer-close"
          type="button"
        >
          ✕
        </button>

        <div
          className="ai-drawer-body"
          style={{
            flex: 1,
            minHeight: 0,
            padding: 24,
            paddingTop: 32,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
