// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import CheforaParticleHero from "@/components/CheforaParticleHero";

type Meal = { idMeal: string; strMeal: string; strMealThumb: string };

async function byIngredient(q: string): Promise<Meal[]> {
  if (!q) return [];
  const r = await fetch(
    `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(
      q
    )}`
  );
  const j = await r.json();
  return j?.meals ?? [];
}
async function randomMeal(): Promise<any | null> {
  const r = await fetch("https://www.themealdb.com/api/json/v1/1/random.php");
  const j = await r.json();
  return j?.meals?.[0] ?? null;
}
async function list(kind: "c" | "a") {
  const r = await fetch(
    `https://www.themealdb.com/api/json/v1/1/list.php?${kind}=list`
  );
  const j = await r.json();
  return j?.meals ?? [];
}
async function by(kind: "c" | "a", v: string) {
  const r = await fetch(
    `https://www.themealdb.com/api/json/v1/1/filter.php?${kind}=${encodeURIComponent(
      v
    )}`
  );
  const j = await r.json();
  return j?.meals ?? [];
}
async function byId(id: string) {
  const r = await fetch(
    `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
  );
  const j = await r.json();
  return j?.meals?.[0] ?? null;
}

/* media hook */
function useMedia(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
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

  const [tab, setTab] = useState<"browse" | "search" | "special">("browse");
  const [term, setTerm] = useState("flour");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    data: searchMeals,
    isFetching: loadingSearch,
    refetch: runSearch,
  } = useQuery({
    queryKey: ["byIng", term],
    queryFn: () => byIngredient(term),
    enabled: !!term,
  });

  const [nonce, setNonce] = useState(0);
  const { data: special, isFetching: rolling } = useQuery({
    queryKey: ["random", nonce],
    queryFn: randomMeal,
  });

  const [cat, setCat] = useState("vegetarian");
  const [area, setArea] = useState("Italian");
  const { data: cats } = useQuery({
    queryKey: ["cats"],
    queryFn: () => list("c"),
  });
  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: () => list("a"),
  });
  const { data: byCat, isFetching: loadingCat } = useQuery({
    queryKey: ["byCat", cat],
    queryFn: () => by("c", cat),
  });
  const { data: byArea, isFetching: loadingArea } = useQuery({
    queryKey: ["byArea", area],
    queryFn: () => by("a", area),
  });

  const { data: meal } = useQuery({
    queryKey: ["meal", selectedId],
    queryFn: () => byId(selectedId!),
    enabled: !!selectedId,
  });

  const ingredients = useMemo(() => {
    if (!meal) return [];
    return Array.from({ length: 20 }, (_, i) => i + 1)
      .map((n) => ({
        ing: (meal as any)[`strIngredient${n}`],
        mea: (meal as any)[`strMeasure${n}`],
      }))
      .filter((x) => x.ing);
  }, [meal]);

  const [hole, setHole] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  useEffect(() => {
    function updateHole() {
      const el = document.querySelector(
        ".drawer .panel"
      ) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setHole({ x: r.left, y: r.top, w: r.width, h: r.height });
    }
    if (selectedId) {
      updateHole();
      window.addEventListener("resize", updateHole);
      window.addEventListener("scroll", updateHole, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", updateHole);
      window.removeEventListener("scroll", updateHole);
    };
  }, [selectedId]);

  const [catQuery, setCatQuery] = useState("");
  const [catExpanded, setCatExpanded] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const [areaExpanded, setAreaExpanded] = useState(false);

  const filteredCats = (cats ?? []).filter((c: any) =>
    c.strCategory.toLowerCase().includes(catQuery.toLowerCase())
  );
  const filteredAreas = (areas ?? []).filter((a: any) =>
    a.strArea.toLowerCase().includes(areaQuery.toLowerCase())
  );

  return (
    <>
    {/* Morphing particles overlay – does NOT push content down */}
    <CheforaParticleHero />

      {/* Original app UI below */}
      <div className="bg-base" aria-hidden />
      <div className="bg-anim" aria-hidden>
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
            href="/"
            onClick={() => setTab("browse")}
            style={{
              display: "block",
            }}
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
            <button
              className={`tab tap-ripple ${tab === "browse" ? "active" : ""}`}
              role="tab"
              aria-selected={tab === "browse"}
              onClick={() => setTab("browse")}
            >
              🍽️ <span style={{ marginLeft: 6 }}>Browse</span>
            </button>

            <button
              className={`tab tap-ripple ${tab === "search" ? "active" : ""}`}
              role="tab"
              aria-selected={tab === "search"}
              onClick={() => setTab("search")}
            >
              🔎 <span style={{ marginLeft: 6 }}>Search</span>
            </button>

            <button
              className={`tab tap-ripple ${tab === "special" ? "active" : ""}`}
              role="tab"
              aria-selected={tab === "special"}
              onClick={() => setTab("special")}
            >
              👨‍🍳 <span style={{ marginLeft: 6 }}>Chef’s Special</span>
            </button>

            {/* ⭐ NEW: AI Recipes Link */}
            <Link
              href="/ai-recipes"
              className="tab tap-ripple"
              style={{
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
                padding: "10px 14px",
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

      <div
        className="container layer-content"
        style={{ paddingTop: isCompact ? 100 : 120 }}
      >
        {tab !== "browse" && (
          <div className="glass ios solid hero layer-content">
            <div className="searchRow">
              <div className="inputIcon" style={{ flex: 1 }}>
                <i>🔎</i>
                <input
                  className="input"
                  placeholder="Search ingredients… e.g., chicken, tomato, rice"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                />
              </div>
              <button
                className="btn tap-ripple"
                onClick={() => {
                  setTab("search");
                  runSearch();
                }}
              >
                Search
              </button>
            </div>
          </div>
        )}

        {tab === "browse" && (
          <>
            <div className="sectionTitle">Browse by Category</div>

            <div className="toolbar">
              <div className="inputIcon" style={{ flex: 1 }}>
                <i>🔎</i>
                <input
                  className="input"
                  placeholder="Filter categories…"
                  value={catQuery}
                  onChange={(e) => setCatQuery(e.target.value)}
                />
              </div>
              <button
                className="btn ghost tap-ripple"
                onClick={() => setCatExpanded((v) => !v)}
              >
                {catExpanded ? "Collapse" : "Show all"}
              </button>
            </div>

            {!catExpanded ? (
              <div className="chip-row" role="listbox" aria-label="Categories">
                {filteredCats.map((c: any, i: number) => (
                  <button
                    key={i}
                    className={`chip tap-ripple ${
                      c.strCategory === cat ? "active" : ""
                    }`}
                    onClick={() => setCat(c.strCategory)}
                    style={{ ["--i" as any]: i }}
                    aria-pressed={c.strCategory === cat}
                    role="option"
                  >
                    <span className="chip-dot" />
                    <span className="chip-label">{c.strCategory}</span>
                  </button>
                ))}
                {!filteredCats.length && (
                  <div className="subtitle" style={{ marginTop: 8 }}>
                    No categories match “{catQuery}”.
                  </div>
                )}
              </div>
            ) : (
              <div className="cat-grid">
                {filteredCats.map((c: any, i: number) => (
                  <button
                    key={i}
                    className={`chip tap-ripple ${
                      c.strCategory === cat ? "active" : ""
                    }`}
                    onClick={() => setCat(c.strCategory)}
                    style={{ ["--i" as any]: i }}
                    aria-pressed={c.strCategory === cat}
                  >
                    <span className="chip-dot" />
                    <span className="chip-label">{c.strCategory}</span>
                  </button>
                ))}
              </div>
            )}

            {loadingCat && <SkeletonGrid />}

            <div className="grid">
              {byCat?.map((m: Meal, i: number) => (
                <div
                  key={m.idMeal}
                  className="glass card card-mount"
                  style={{ ["--i" as any]: i }}
                >
                  <button
                    className="tap-ripple"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onClick={() => setSelectedId(m.idMeal)}
                  >
                    <img
                      className="img-fade"
                      src={m.strMealThumb}
                      alt={m.strMeal}
                      style={{
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        width: "100%",
                      }}
                    />
                    <div className="cardBody">
                      <div className="cardTitle">{m.strMeal}</div>
                      <div className="cardLink">View details</div>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            <div className="sectionTitle" style={{ marginTop: 18 }}>
              Browse by Area
            </div>

            <div className="toolbar">
              <div className="inputIcon" style={{ flex: 1 }}>
                <i>🔎</i>
                <input
                  className="input"
                  placeholder="Filter areas…"
                  value={areaQuery}
                  onChange={(e) => setAreaQuery(e.target.value)}
                />
              </div>
              <button
                className="btn ghost tap-ripple"
                onClick={() => setAreaExpanded((v) => !v)}
              >
                {areaExpanded ? "Collapse" : "Show all"}
              </button>
            </div>

            {!areaExpanded ? (
              <div className="chip-row" role="listbox" aria-label="Areas">
                {filteredAreas.map((a: any, i: number) => (
                  <button
                    key={i}
                    className={`chip tap-ripple ${
                      a.strArea === area ? "active" : ""
                    }`}
                    onClick={() => setArea(a.strArea)}
                    style={{ ["--i" as any]: i }}
                    aria-pressed={a.strArea === area}
                    role="option"
                  >
                    <span className="chip-dot" />
                    <span className="chip-label">{a.strArea}</span>
                  </button>
                ))}
                {!filteredAreas.length && (
                  <div className="subtitle" style={{ marginTop: 8 }}>
                    No areas match “{areaQuery}”.
                  </div>
                )}
              </div>
            ) : (
              <div className="cat-grid">
                {filteredAreas.map((a: any, i: number) => (
                  <button
                    key={i}
                    className={`chip tap-ripple ${
                      a.strArea === area ? "active" : ""
                    }`}
                    onClick={() => setArea(a.strArea)}
                    style={{ ["--i" as any]: i }}
                    aria-pressed={a.strArea === area}
                  >
                    <span className="chip-dot" />
                    <span className="chip-label">{a.strArea}</span>
                  </button>
                ))}
              </div>
            )}

            {loadingArea && <SkeletonGrid />}

            <div className="grid">
              {byArea?.map((m: any, i: number) => (
                <div
                  key={m.idMeal}
                  className="glass card card-mount"
                  style={{ ["--i" as any]: i }}
                >
                  <button
                    className="tap-ripple"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onClick={() => setSelectedId(m.idMeal)}
                  >
                    <img
                      className="img-fade"
                      src={m.strMealThumb}
                      alt={m.strMeal}
                      style={{
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        width: "100%",
                      }}
                    />
                    <div className="cardBody">
                      <div className="cardTitle">{m.strMeal}</div>
                      <div className="cardLink">View details</div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "search" && (
          <>
            <div className="sectionTitle">Results for “{term}”</div>
            {loadingSearch && <SkeletonGrid />}
            <div className="grid">
              {searchMeals?.map((m: Meal, i: number) => (
                <div
                  key={m.idMeal}
                  className="glass card card-mount"
                  style={{ ["--i" as any]: i }}
                >
                  <button
                    className="tap-ripple"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onClick={() => setSelectedId(m.idMeal)}
                  >
                    <img
                      className="img-fade"
                      src={m.strMealThumb}
                      alt={m.strMeal}
                      style={{
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        width: "100%",
                      }}
                    />
                    <div className="cardBody">
                      <div className="cardTitle">{m.strMeal}</div>
                      <div className="cardLink">View details</div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "special" && (
          <>
            <div className="sectionTitle">Chef’s Special</div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 10,
              }}
            >
              <button
                className="btn ghost tap-ripple"
                onClick={() => setNonce((n) => n + 1)}
                disabled={rolling}
              >
                {rolling ? "Rolling..." : "New random"}
              </button>
            </div>
            {rolling && <SkeletonCard />}
            {special && !rolling && (
              <div className="glass card special-reel">
                <button
                  className="tap-ripple"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                  }}
                  onClick={() => setSelectedId(special.idMeal)}
                >
                  <img
                    className="img-fade"
                    src={special.strMealThumb}
                    alt={special.strMeal}
                    style={{
                      aspectRatio: "16/9",
                      objectFit: "cover",
                      width: "100%",
                    }}
                  />
                  <div className="cardBody">
                    <div className="cardTitle" style={{ fontSize: 16 }}>
                      {special.strMeal}
                    </div>
                    <div className="subtitle">
                      {special.strCategory} • {special.strArea}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedId && (
        <DrawerWithContentAnimation
          hole={hole}
          meal={meal}
          onRequestClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}

function DrawerWithContentAnimation({
  hole,
  meal,
  onRequestClose,
}: {
  hole: { x: number; y: number; w: number; h: number } | null;
  meal: any;
  onRequestClose: () => void;
}) {
  const CONTENT_MS = 700;
  const [phase, setPhase] = useState<"enter" | "idle" | "leave">("enter");

  useEffect(() => {
    const t = setTimeout(() => setPhase("idle"), CONTENT_MS);
    return () => clearTimeout(t);
  }, []);

  const startClose = () => {
    if (phase === "leave") return;
    setPhase("leave");
    const t = setTimeout(() => onRequestClose(), CONTENT_MS);
    return () => clearTimeout(t);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && startClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  return (
    <aside
      className="drawer open"
      role="dialog"
      aria-modal="true"
      aria-label="Meal details"
    >
      {hole && (
        <svg
          className="dimmer"
          onClick={startClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            width: "100vw",
            height: "100vh",
            pointerEvents: "auto",
          }}
        >
          <defs>
            <mask id="hole-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={hole.x - 4}
                y={hole.y - 4}
                width={hole.w + 8}
                height={hole.h + 8}
                rx="26"
                ry="26"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.85)"
            mask="url(#hole-mask)"
          />
        </svg>
      )}

      <div
        className="panel glass ios clear"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && startClose()}
      >
        <div className={`drawer-content ${phase}`}>
          <div className="surface header">
            <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>
              {meal?.strMeal ?? "Recipe"}
            </h2>
            <button
              aria-label="Close details"
              onClick={startClose}
              style={{
                marginLeft: "auto",
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(15,17,22,0.6)",
                color: "#E8EEF6",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {meal && (
            <>
              <div className="surface meta-block">
                <p className="meta-row">
                  <b>Category:</b> {meal.strCategory}
                </p>
                <p className="meta-row">
                  <b>Area:</b> {meal.strArea}
                </p>
              </div>

              <div className="surface hero-image">
                <img src={meal.strMealThumb} alt={meal.strMeal} />
              </div>

              <div
                className="glass-card section-title no-overlay cyan-title"
                id="instructionsTitle"
              >
                <h3>Instructions</h3>
              </div>

              <div className="steps-stack">
                {(meal?.strInstructions ?? "")
                  .split(/\r?\n|\.\s+(?=[A-Z])/g)
                  .map((s: string) => s.replace(/^\s*\d+[\).\s-]*/g, ""))
                  .map((s: string) => s.trim())
                  .filter((s: string) => s.length > 0)
                  .map((s: string, i: number) => (
                    <div
                      className="step-card"
                      key={i}
                      style={{ ["--i" as any]: i }}
                    >
                      <span className="step-index">{i + 1}</span>
                      <p className="step-text">{s}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
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
    <div className="glass" style={{ overflow: "hidden" }}>
      <div className="skeleton" style={{ width: "100%", aspectRatio: "16/9" }} />
      <div style={{ padding: 10 }}>
        <div className="skeleton" style={{ height: 14, width: "70%" }} />
      </div>
    </div>
  );
}
