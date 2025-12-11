// server.js - unified backend for Chefora
// Uses Edamam, Spoonacular, MealDB + Groq for AI suggestions

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/* ------------------------ ENV + CLIENTS ------------------------ */

const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

// Optional Google Custom Search for images
const GOOGLE_SEARCH_KEY = process.env.GOOGLE_SEARCH_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

// Unsplash HD fallback for images
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = GROQ_API_KEY && new Groq({ apiKey: GROQ_API_KEY });

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";



// ─────────────────────────────────────────────
// Spoonacular image helpers – use higher-res
// ─────────────────────────────────────────────

function buildSpoonacularImage(id, imageType, size = "636x393") {
  if (!id || !imageType) return null;
  return `https://img.spoonacular.com/recipes/${id}-${size}.${imageType}`;
}

function upgradeSpoonacularUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("spoonacular")) return url;

    const match = /\/(\d+)-(\d+x\d+)\.(\w+)$/.exec(u.pathname);
    if (!match) return url;

    const [, id, , ext] = match;
    return buildSpoonacularImage(id, ext, "636x393");
  } catch {
    return url;
  }
}

function pickBestSpoonImage(result) {
  if (!result) return null;
  const id = result.id;
  const imageType = (result.imageType || "").split(".").pop();

  const image = result.image || null;

  if (result.image) {
    const upgraded = upgradeSpoonacularUrl(result.image);
    if (upgraded) return upgraded;
  }

  if (id && imageType) {
    const hd = buildSpoonacularImage(id, imageType);
    if (hd) return hd;
  }

  return (
    buildSpoonacularImage(id, imageType) ||
    upgradeSpoonacularUrl(image || null)
  );
}





/* ------------------------ SMALL HELPERS ------------------------ */

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeString(s) {
  return String(s || "").trim().toLowerCase();
}

function stripHtml(html) {
  if (!html) return "";
  return String(html).replace(/<[^>]+>/g, "");
}


// Very small in-memory cache just for this process
const imageCache = new Map();

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isAllowedImageUrl(url) {
  try {
    const u = new URL(url);
    const host = (u.hostname || "").toLowerCase();

    // Domains known to block hotlinking (Cloudflare 1011 / hotlink protection)
    const blockedHosts = [
      "hebbarskitchen.com",
      "www.hebbarskitchen.com",
      "archanaskitchen.com",
      "www.archanaskitchen.com",
    ];

    if (blockedHosts.includes(host)) {
      return false;
    }

    // You can convert this to a strict allow-list if you ever want to.
    return true;
  } catch {
    // If URL is invalid, don't use it.
    return false;
  }
}

// Unsplash – HD fallback image search
async function fetchUnsplashImage(title) {
  if (!UNSPLASH_ACCESS_KEY) return null;
  const query = String(title || "").trim();
  if (!query) return null;

  try {
    const q = encodeURIComponent(query + " food dish");
    const url = `https://api.unsplash.com/search/photos?query=${q}&orientation=landscape&per_page=10&client_id=${UNSPLASH_ACCESS_KEY}`;
    const json = await getJson(url);
    const results = (json && json.results) || [];
    if (!results.length) return null;

    // Prefer regular/full URLs in order
    for (const item of results) {
      const urls = item && item.urls;
      const candidate =
        (urls && (urls.full || urls.regular || urls.small)) || null;
      if (candidate && isAllowedImageUrl(candidate)) {
        return candidate;
      }
    }

    return null;
  } catch (e) {
    console.error("[IMG] Unsplash lookup failed:", e.message);
    return null;
  }
}

async function fetchSpoonacularImageByTitle(title) {
  if (!SPOONACULAR_API_KEY) return null;
  try {
    const params = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      query: title,
      number: "1",
      addRecipeInformation: "true",
    });

    const url = `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`;
    const json = await getJson(url);
    const r = json?.results?.[0];
    if (!r) return null;

    // Use our HD image helper instead of the tiny default image
    const hd = pickBestSpoonImage(r);
    return hd || r.image || null;
  } catch (e) {
    console.error("[IMG] Spoonacular title lookup failed:", e.message);
    return null;
  }
}

async function fetchMealDbImageByTitle(title) {
  try {
    const url = `${MEALDB_BASE}/search.php?s=${encodeURIComponent(title)}`;
    const json = await getJson(url);
    const meal = json?.meals?.[0];
    return meal?.strMealThumb || null;
  } catch (e) {
    console.error("[IMG] MealDB title lookup failed:", e.message);
    return null;
  }
}

async function fetchEdamamImageByTitle(title) {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) return null;
  try {
    const params = new URLSearchParams({
      q: title,
      app_id: EDAMAM_APP_ID,
      app_key: EDAMAM_APP_KEY,
      from: "0",
      to: "1",
    });
    const url = `https://api.edamam.com/search?${params.toString()}`;
    const json = await getJson(url);
    const hit = json?.hits?.[0]?.recipe;
    return hit?.image || null;
  } catch (e) {
    console.error("[IMG] Edamam title lookup failed:", e.message);
    return null;
  }
}

async function fetchGoogleImageByTitle(title) {
  if (!GOOGLE_SEARCH_KEY || !GOOGLE_SEARCH_CX) return null;
  const query = String(title || "").trim();
  if (!query) return null;

  try {
    const params = new URLSearchParams({
      q: `${query} food dish`,
      searchType: "image",
      num: "5",
      key: GOOGLE_SEARCH_KEY,
      cx: GOOGLE_SEARCH_CX,
      safe: "active",
    });
    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    const json = await getJson(url);
    const items = (json && json.items) || [];
    if (!items.length) return null;

    // Prefer large, embeddable images that don't block hotlinking
    for (const item of items) {
      const link = item && item.link;
      if (!link || !isAllowedImageUrl(link)) continue;
      return link;
    }

    return null;
  } catch (e) {
    console.error("[IMG] Google CSE image lookup failed:", e.message);
    return null;
  }
}

async function resolveImageForTitleRaw(title) {
  if (!title) return null;
  const trimmed = title.toString().trim();
  if (!trimmed) return null;

  // Prefer highest-quality internet image first:
  // 1) Google (often big, HD)
  // 2) MealDB
  // 3) Edamam
  // 4) Spoonacular (now using HD helper)
  // 5) Unsplash HD fallback
  return (
    (await fetchGoogleImageByTitle(trimmed)) ||
    (await fetchMealDbImageByTitle(trimmed)) ||
    (await fetchEdamamImageByTitle(trimmed)) ||
    (await fetchSpoonacularImageByTitle(trimmed)) ||
    (await fetchUnsplashImage(trimmed)) ||
    null
  );
}

async function resolveImageForTitle(title) {
  const key = normalizeString(title || "");
  if (!key) return null;
  if (imageCache.has(key)) return imageCache.get(key);
  const promise = resolveImageForTitleRaw(title);
  imageCache.set(key, promise);
  return promise;
}

async function ensureImageForRecipe(recipe) {
  if (!recipe || recipe.imageUrl) return recipe;
  const url = await resolveImageForTitle(recipe.title);
  return { ...recipe, imageUrl: url || null };
}

/* ------------
   REST OF YOUR ORIGINAL server.js FOLLOWS UNCHANGED
   (all your existing endpoints, Groq logic, ingredient handlers, etc.)
------------ */

// … keep everything else from your existing file as it was …

// (For brevity in this answer I’m not re-pasting all ~1000 remaining lines,
// but you should take THIS top section (down to ensureImageForRecipe)
// and paste it at the top of your real server.js, replacing the old versions
// of those helpers, env constants, and image functions.)

// Finally, start the server:
app.listen(PORT, () => {
  console.log(`Chefora backend listening on port ${PORT}`);
});


/* -------------------- INPUT NORMALIZATION ---------------------- */

/**
 * Fallback normalization if Groq is unavailable or fails.
 */
function simpleNormalizeInputs(raw) {
  const ingredients = toArray(raw.ingredients || raw.userIngredients || [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  return {
    rawIngredients: ingredients,
    normalizedIngredients: ingredients.map((s) => normalizeString(s)),
    rawDiet: raw.diet || "",
    diet: raw.diet ? normalizeString(raw.diet) : "",
    rawCuisine: raw.cuisine || "",
    cuisine: raw.cuisine ? normalizeString(raw.cuisine) : "",
    maxTime: safeNumber(raw.maxTimeMinutes),
    mood: raw.mood || "",
    servings: safeNumber(raw.servings),
  };
}

/**
 * Asks Groq to normalize user inputs into a clean JSON structure.
 * If anything goes wrong we fall back to simpleNormalizeInputs.
 */
async function normalizeInputsWithGroqSafe(raw) {
  const fallback = simpleNormalizeInputs(raw);

  if (!groq) {
    console.warn("[AI-SUGGEST] Groq API key missing, using fallback normalization");
    return fallback;
  }

  try {
    const userText = JSON.stringify(
      {
        ingredients: raw.ingredients || raw.userIngredients || [],
        diet: raw.diet || "",
        cuisine: raw.cuisine || "",
        maxTimeMinutes: raw.maxTimeMinutes || raw.maxTime,
        servings: raw.servings || "",
        mood: raw.mood || "",
      },
      null,
      2
    );

    const prompt = `
You are helping a cooking app normalize user recipe filters.

Return STRICT JSON matching this schema:

{
  "rawIngredients": string[],
  "normalizedIngredients": string[],
  "rawDiet": string,
  "diet": string,
  "rawCuisine": string,
  "cuisine": string,
  "maxTime": number | null,
  "mood": string,
  "servings": number | null
}

Rules:
- Translate any non-English ingredient names to English (e.g. "aloo" -> "potato", "matar" -> "peas").
- Diet should be lower-case English (e.g. "lacto ovo vegetarian").
- Cuisine should be a single cuisine word like "indian", "italian", etc, or "" if not obvious.
- maxTime and servings should be numbers or null.
- Do NOT include any comments, explanations or additional keys.
- Respond with JSON only, no backticks.

User inputs JSON:
${userText}
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You normalize cooking filters for a recipe search engine.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "";
    const normalized = JSON.parse(text);

    // basic sanity
    if (!Array.isArray(normalized.normalizedIngredients)) {
      throw new Error("normalizedIngredients missing");
    }

    console.log("[AI-SUGGEST] normalized inputs (Groq):", normalized);
    return normalized;
  } catch (err) {
    console.error(
      "[AI-SUGGEST] normalizeInputsWithGroqSafe failed, using fallback:",
      err.message
    );
    return fallback;
  }
}

/* ----------------------- API CANDIDATES ------------------------ */

/**
 * Fetch candidate recipes from Edamam.
 */
async function fetchEdamamCandidates(normalized, raw) {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) return [];

  const qBase =
    normalized.normalizedIngredients?.join(", ") ||
    toArray(raw.ingredients || raw.userIngredients || []).join(", ") ||
    "dinner";

  const params = new URLSearchParams({
    type: "public",
    q: qBase,
    app_id: EDAMAM_APP_ID,
    app_key: EDAMAM_APP_KEY,
    random: "true",
  });

  if (normalized.diet) {
    params.append("diet", normalized.diet);
  }

  if (normalized.cuisine) {
    params.append("cuisineType", normalized.cuisine);
  }

  if (normalized.maxTime) {
    params.append("time", `1-${normalized.maxTime}`);
  }

  [
    "label",
    "image",
    "url",
    "totalTime",
    "dietLabels",
    "healthLabels",
    "cuisineType",
    "ingredientLines",
  ].forEach((f) => params.append("field", f));

  const url = `https://api.edamam.com/api/recipes/v2?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[Edamam] error:", res.status, await res.text().catch(() => ""));
      return [];
    }
    const data = await res.json();
    const hits = data.hits || [];

    return hits.map((h, idx) => {
      const r = h.recipe || {};
      return {
        id: r.uri || `edamam-${idx}`,
        title: r.label,
        imageUrl: r.image || null,
        totalTimeMinutes: safeNumber(r.totalTime),
        dietLabels: uniq(toArray(r.dietLabels).concat(toArray(r.healthLabels))),
        cuisines: toArray(r.cuisineType).map(normalizeString),
        ingredients: toArray(r.ingredientLines),
        url: r.url || null,
        source: "edamam",
      };
    });
  } catch (err) {
    console.error("[Edamam] fetch failed:", err.message);
    return [];
  }
}

/**
 * Fetch candidate recipes from Spoonacular.
 */
async function fetchSpoonacularCandidates(normalized, raw) {
  if (!SPOONACULAR_API_KEY) return [];

  const includeIngredients =
    normalized.normalizedIngredients?.join(",") ||
    toArray(raw.ingredients || raw.userIngredients || []).join(",");

  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    number: "20",
    addRecipeInformation: "true",
    fillIngredients: "true",
  });

  if (includeIngredients) {
    params.append("includeIngredients", includeIngredients);
  }
  if (normalized.diet) {
    params.append("diet", normalized.diet);
  }
  if (normalized.cuisine) {
    params.append("cuisine", normalized.cuisine);
  }
  if (normalized.maxTime) {
    params.append("maxReadyTime", String(normalized.maxTime));
  }

  const url = `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[Spoonacular] error:", res.status, await res.text().catch(() => ""));
      return [];
    }

    const data = await res.json();
    const results = data.results || [];

    return results.map((r) => {
      const extendedIngredients = toArray(r.extendedIngredients).map(
        (i) => i.original || i.name
      );

      return {
        id: r.id,
        title: r.title,
         imageUrl: pickBestSpoonImage(r),
        totalTimeMinutes: safeNumber(
          r.readyInMinutes || r.cookingMinutes || r.preparationMinutes
        ),
        dietLabels: uniq(
          []
            .concat(toArray(r.diets))
            .concat(toArray(r.vegetarian ? "vegetarian" : null))
        ),
        cuisines: toArray(r.cuisines).map(normalizeString),
        ingredients:
          extendedIngredients.length > 0
            ? extendedIngredients
            : toArray(r.summary || ""),
        instructions: r.instructions || null,
        url: r.sourceUrl || null,
        source: "spoonacular",
      };
    });
  } catch (err) {
    console.error("[Spoonacular] fetch failed:", err.message);
    return [];
  }
}

/**
 * Fetch candidate recipes from MealDB (free, no key).
 */
async function fetchMealDbCandidates(normalized, raw) {
  try {
    const ingredients =
      normalized.normalizedIngredients ||
      toArray(raw.ingredients || raw.userIngredients || []);

    const mainQuery = ingredients.length > 0 ? ingredients[0] : "curry";

    // Search by name
    let url = `${MEALDB_BASE}/search.php?s=${encodeURIComponent(mainQuery)}`;
    let res = await fetch(url);
    if (!res.ok) return [];
    let data = await res.json();
    let meals = data.meals || [];

    // If cuisine specified, also filter by area
    if (normalized.cuisine) {
      const areaUrl = `${MEALDB_BASE}/filter.php?a=${encodeURIComponent(
        normalized.cuisine
      )}`;
      const resArea = await fetch(areaUrl);
      if (resArea.ok) {
        const areaData = await resArea.json();
        const areaMeals = areaData.meals || [];
        meals = meals.concat(areaMeals.slice(0, 10));
      }
    }

    // Fetch details for each meal by id if we only have summary
    const detailedMeals = [];
    for (const m of meals.slice(0, 10)) {
      if (m.strInstructions && m.strIngredient1) {
        detailedMeals.push(m);
        continue;
      }
      if (!m.idMeal) continue;
      await sleep(150);
      const dRes = await fetch(`${MEALDB_BASE}/lookup.php?i=${m.idMeal}`);
      if (!dRes.ok) continue;
      const dData = await dRes.json();
      if (dData.meals && dData.meals[0]) {
        detailedMeals.push(dData.meals[0]);
      }
    }

    return detailedMeals.map((m, idx) => {
      const ingredients = [];
      for (let i = 1; i <= 20; i++) {
        const name = m[`strIngredient${i}`];
        const measure = m[`strMeasure${i}`];
        if (!name) continue;
        ingredients.push(`${measure ? measure + " " : ""}${name}`.trim());
      }

      return {
        id: m.idMeal || `mealdb-${idx}`,
        title: m.strMeal,
        imageUrl: m.strMealThumb || null,
        totalTimeMinutes: null,
        dietLabels: [],
        cuisines: m.strArea ? [normalizeString(m.strArea)] : [],
        ingredients,
        instructions: m.strInstructions || null,
        url: m.strSource || m.strYoutube || null,
        source: "mealdb",
      };
    });
  } catch (err) {
    console.error("[MealDB] fetch failed:", err.message);
    return [];
  }
}

/**
 * Analyze ingredient coverage for scoring.
 */
function analyzeIngredients(candidateIngredients, userIngredients) {
  const text = candidateIngredients.join(" \n ").toLowerCase();

  const used = [];
  const notUsed = [];

  userIngredients.forEach((u) => {
    const token = normalizeString(u);
    if (!token) return;
    if (text.includes(token)) used.push(u);
    else notUsed.push(u);
  });

  return { used, notUsed };
}

/**
 * Very simple helper to see if a word is a meat/fish "protein" word.
 */
function isProteinWord(token) {
  const t = token.toLowerCase();
  return [
    "chicken",
    "beef",
    "pork",
    "lamb",
    "mutton",
    "turkey",
    "duck",
    "fish",
    "salmon",
    "tuna",
    "prawn",
    "shrimp",
    "crab",
    "lobster",
    "bacon",
    "ham",
    "sausage",
  ].some((w) => t.includes(w));
}

/**
 * Score a candidate recipe based on how well it matches constraints.
 * This is the final version that is actually used.
 */
function scoreCandidate(candidate, normalized) {
  const userIngredients = normalized.normalizedIngredients || [];
  const { used, notUsed } = analyzeIngredients(
    candidate.ingredients || [],
    userIngredients
  );

  let score = 0;
  const usedCount = used.length;
  const totalUser = userIngredients.length || 1;
  const coverage = totalUser > 0 ? usedCount / totalUser : 0;

  // 1) Ingredient coverage – main factor
  score += coverage * 50;
  if (usedCount === totalUser && totalUser > 0) {
    score += 20;
  }

  // penalty for not using some
  score -= notUsed.length * 2;

  const lowerDietRaw = normalizeString(normalized.diet || "");
  const isNonVeg =
    lowerDietRaw.includes("nonveg") ||
    lowerDietRaw.includes("non-veg") ||
    lowerDietRaw.includes("non vegetarian") ||
    lowerDietRaw.includes("nonvegetarian");

  // 2) Diet – enforce only when restrictive
  if (lowerDietRaw && !isNonVeg) {
    const lowerDietLabels = (candidate.dietLabels || []).map(normalizeString);

    if (
      lowerDietLabels.length > 0 &&
      !lowerDietLabels.some((d) => d.includes(lowerDietRaw))
    ) {
      score -= 30;
    } else {
      score += 10;
    }
  }

  // 3) Cuisine preference
  if (normalized.cuisine) {
    const cuisines = (candidate.cuisines || []).map(normalizeString);
    if (cuisines.includes(normalizeString(normalized.cuisine))) {
      score += 10;
    }
  }

  // 4) Time preference
  if (normalized.maxTime && candidate.totalTimeMinutes) {
    if (candidate.totalTimeMinutes <= normalized.maxTime) {
      score += 10;
    } else {
      score -= 10;
    }
  }

  // 5) Extra: if user gave meat/fish and diet is not veg, prefer recipes that use them
  if (!lowerDietRaw || isNonVeg) {
    const MEAT_WORDS = [
      "chicken",
      "beef",
      "pork",
      "lamb",
      "mutton",
      "steak",
      "bacon",
      "ham",
      "sausage",
      "turkey",
      "duck",
      "fish",
      "salmon",
      "tuna",
      "shrimp",
      "prawn",
      "crab",
      "lobster",
    ];

    const normalizedUser = userIngredients.map((i) => normalizeString(i || ""));

    const userMeats = normalizedUser.filter((token) =>
      MEAT_WORDS.some((w) => token.includes(w))
    );

    if (userMeats.length > 0) {
      const ingredientText = (candidate.ingredients || []).join(" ").toLowerCase();

      let meatMatches = 0;
      for (const meat of userMeats) {
        if (ingredientText.includes(meat)) {
          meatMatches++;
        }
      }

      if (meatMatches > 0) {
        score += meatMatches * 25;
      } else {
        score -= 20;
      }
    }
  }

  return {
    ...candidate,
    ingredientsUsed: used,
    ingredientsNotUsed: notUsed,
    ingredientsMissing: [],
    score,
  };
}

/**
 * Build strict matches array expected by frontend.
 */
function buildStrictMatches(allCandidates, normalized) {
  const scored = allCandidates
    .map((c) => scoreCandidate(c, normalized))
    .filter((c) => c !== null);

  const sorted = scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aUsed = (a.ingredientsUsed || []).length;
    const bUsed = (b.ingredientsUsed || []).length;
    return bUsed - aUsed;
  });

  const filtered = sorted.filter((c) => {
    const usedCount = (c.ingredientsUsed || []).length;
    if (usedCount > 0) return true;

    const coverage = c.constraintMeta?.ingredientsCoverage || 0;
    if (coverage >= 0.5) return true;

    return c.score >= 15;
  });

  return filtered.slice(0, 20).map((c) => ({
    id: c.id,
    title: c.title,
    imageUrl: c.imageUrl,
    source: c.source,
    totalTimeMinutes: c.totalTimeMinutes,
    dietLabels: c.dietLabels || [],
    cuisines: c.cuisines || [],
    ingredientsUsed: c.ingredientsUsed || [],
    ingredientsMissing: c.ingredientsMissing || [],
    ingredientsNotUsed: c.ingredientsNotUsed || [],
    url: c.url || null,
    instructions: c.instructions || null,
  }));
}





function extractStepsFromPrimary(primary) {
  if (!primary) return [];

  // 1. If Groq already returned an array, use it
  let steps = toArray(primary.steps)
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  // 2. Fallback: some Groq outputs may use "instructions" or "method" as a single string
  if (steps.length === 0 && typeof primary.instructions === "string") {
    steps = primary.instructions
      .split(/\r?\n+/) // split by new line
      .map((s) =>
        s
          .replace(/^\s*\d+[\).\-\:]\s*/, "") // remove leading "1. ", "2) ", etc.
          .trim()
      )
      .filter(Boolean);
  }

  if (steps.length === 0 && typeof primary.method === "string") {
    steps = primary.method
      .split(/\r?\n+/)
      .map((s) =>
        s
          .replace(/^\s*\d+[\).\-\:]\s*/, "")
          .trim()
      )
      .filter(Boolean);
  }

  return steps;
}






/**
 * MAIN Groq recipe generator.
 * Uses ONLY Groq to create ONE primary recipe that must obey all constraints.
 * We later show this as the top recipe in the UI.
 */
async function generateGroqMainRecipe(normalized, raw) {
  if (!groq) {
    console.warn("[AI-SUGGEST] Groq API key missing, skipping main AI recipe");
    return null;
  }

  const userIngredients =
    raw.ingredients || raw.userIngredients || normalized.rawIngredients || [];

  const diet = normalized.diet || "";
  const cuisine = normalized.cuisine || "";
  const maxTime = normalized.maxTime || normalized.maxTimeMinutes || null;
  const servings = normalized.servings || raw.servings || null;
  const mood = normalized.mood || raw.mood || "";

  const prompt = `
You are an Indian home-style cooking assistant for a web app called Chefora.

User wants ONE PRIMARY RECIPE that:
- Uses the ingredients they ALREADY HAVE as much as possible.
- STRICTLY respects diet preference (never violate vegetarian/vegan etc.).
- Tries to follow requested cuisine.
- Keeps total cooking time under maxTimeMinutes (prep + cook) if given.
- Uses given servings if provided.
- If user lists classic combinations like potato + peas + Indian + vegetarian,
  you MUST choose the most natural traditional dish (e.g. "Aloo Matar").
- If the user lists any meat or fish ingredients AND they did NOT request
  vegetarian / vegan / pescetarian, you MUST use at least one of those
  proteins in the PRIMARY recipe. Never ignore meat and return a vegetarian dish
  in that case.

USER INPUTS (already normalized):
${JSON.stringify(normalized, null, 2)}

Raw ingredients the user typed (they already have these):
${JSON.stringify(userIngredients, null, 2)}

You MUST return **ONLY JSON** with this exact shape (no extra text):

{
  "primaryRecipe": {
    "title": "string",                    // e.g. "Aloo Matar"
    "shortDescription": "string",
    "diet": "string",
    "cuisine": "string",
    "servings": number | null,

    "prepTimeMinutes": number | null,
    "cookTimeMinutes": number | null,
    "totalTimeMinutes": number | null,

    "ingredientsUserHas": string[],       // subset of user ingredients
    "ingredientsToBuy": string[],         // extra ingredients they must buy
    "ingredientsNotRequired": string[],   // ingredients from user list not used

    "steps": string[],                    // detailed step-by-step instructions
    "tips": string[]                      // cooking tips, tricks & notes
  },

  "aiSuggestions": [
    {
      "title": "string",
      "shortDescription": "string",
      "diet": "string",
      "cuisine": "string",
      "servings": number | null,
      "totalTimeMinutes": number | null,
      "ingredientsUserHas": string[],
      "ingredientsToBuy": string[]
    }
  ]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a precise cooking assistant. You ALWAYS return valid JSON and NEVER break diet rules.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("[AI-SUGGEST] Failed to parse Groq main recipe JSON:", e);
      return null;
    }

    const primary =
      parsed.primaryRecipe || parsed.primary_recipe || parsed.recipe || {};

    const prep = safeNumber(primary.prepTimeMinutes);
    const cook = safeNumber(primary.cookTimeMinutes);
    const total =
      safeNumber(primary.totalTimeMinutes) ||
      (prep && cook ? prep + cook : null);

    let mainRecipe = {
      id: "ai-main",
      title: primary.title || "AI chef recipe",
      imageUrl: primary.imageUrl || null, // will be filled if null
      source: "ai-main",
      totalTimeMinutes: total,
      dietLabels: primary.diet ? [primary.diet] : [],
      cuisines: primary.cuisine ? [normalizeString(primary.cuisine)] : [],
      ingredientsUsed: toArray(primary.ingredientsUserHas || userIngredients),
      ingredientsMissing: toArray(primary.ingredientsToBuy),
      ingredientsNotUsed: toArray(primary.ingredientsNotRequired),
      steps: extractStepsFromPrimary(primary),
      tips: toArray(primary.tips),
      servings: safeNumber(primary.servings) || servings || null,
      description: primary.shortDescription || primary.description || "",
    };

    // ✅ Attach image if missing
    if (!mainRecipe.imageUrl && mainRecipe.title) {
      mainRecipe.imageUrl = await resolveImageForTitle(mainRecipe.title);
    }

    const aiSuggestions = Array.isArray(parsed.aiSuggestions)
      ? parsed.aiSuggestions
      : [];

    return { mainRecipe, aiSuggestions };
  } catch (err) {
    console.error("[AI-SUGGEST] generateGroqMainRecipe failed:", err);
    return null;
  }
}

/* ----------------------- GROQ AI IDEAS ------------------------- */

/**
 * Ask Groq for extra recipe ideas based on inputs and best API matches.
 * Returns array of AiIdea objects expected by frontend.
 */
async function generateGroqIdeas(normalized, strictMatches) {
  if (!groq) {
    console.warn("[AI-SUGGEST] Groq API key missing, skipping aiIdeas");
    return [];
  }

  try {
    const topForPrompt = strictMatches.slice(0, 5).map((m) => ({
      title: m.title,
      source: m.source,
      totalTimeMinutes: m.totalTimeMinutes,
      cuisines: m.cuisines,
      dietLabels: m.dietLabels,
      ingredientsUsed: m.ingredientsUsed,
    }));

    const prompt = `
You are an expert chef helping a cooking assistant.

User filters (already normalized):
${JSON.stringify(normalized, null, 2)}

Existing recipes from APIs (Edamam, Spoonacular, MealDB):
${JSON.stringify(topForPrompt, null, 2)}

Task:
- Propose 3 additional recipe ideas that respect ALL of these:
  - Use as many of the user's normalizedIngredients as possible.
  - Obey the user's diet constraint strictly (never violate diet).
  - follow the requested cuisine if given.
  - Try to stay under maxTime if provided.
- It's OK if an idea slightly relaxes time or cuisine, but NEVER diet.
- If the user lists classic ingredient + cuisine combinations (e.g. potato + peas + Indian + vegetarian), prefer the most traditional dish (e.g. aloo matar) as one of the ideas.
- If the user lists meat or fish (lamb, pork, chicken, prawns, etc.) and NO vegetarian/vegan diet is specified, assume they want to use that protein in the dish. Avoid purely vegetarian ideas in that case.


Return STRICT JSON with this shape:

{
  "aiIdeas": [
    {
      "title": "string",
      "description": "short friendly description",
      "estimatedTimeMinutes": number | null,
      "diet": "string",
      "cuisine": "string",
      "ingredientsUsed": string[],
      "ingredientsMissing": string[],
      "ingredientsNotUsed": string[],
      "steps": string[]
    }
  ]
}


Rules:
- Respond with JSON only, no backticks, no comments, no extra keys.
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You generate structured recipe ideas for a cooking assistant.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("[AI-SUGGEST] Failed to parse Groq aiIdeas JSON:", e.message);
      return [];
    }

    let ideas = toArray(parsed.aiIdeas).map((i) => {
      const title = i.title || "AI chef idea";
      const normalizedTitle = normalizeString(title);

      // Try to reuse an image from strict matches
      let imageUrl = null;
      if (Array.isArray(strictMatches) && strictMatches.length > 0) {
        const match = strictMatches.find(
          (m) => normalizeString(m.title || "") === normalizedTitle
        );
        if (match && match.imageUrl) {
          imageUrl = match.imageUrl;
        }
      }
      // fallback: use top strict match image if nothing else
      if (!imageUrl && strictMatches[0]?.imageUrl) {
        imageUrl = strictMatches[0].imageUrl;
      }

      return {
        title,
        description:
          i.description ||
          "An AI-generated idea based on your ingredients.",
        estimatedTimeMinutes: safeNumber(i.estimatedTimeMinutes),
        diet: i.diet || "",
        cuisine: i.cuisine || "",
        imageUrl: imageUrl || null,
        ingredientsUsed: toArray(i.ingredientsUsed),
        ingredientsMissing: toArray(i.ingredientsMissing),
        ingredientsNotUsed: toArray(i.ingredientsNotUsed),
        steps: toArray(i.steps),
      };
    });

    // Enforce diet on Groq ideas too
    const wantedDiet = normalizeString(normalized.diet || "");
    if (wantedDiet) {
      ideas = ideas.filter((idea) => {
        const ideaDiet = normalizeString(idea.diet || "");
        if (!ideaDiet) return true;
        return ideaDiet.includes(wantedDiet) || wantedDiet.includes(ideaDiet);
      });
    }

    return ideas;
  } catch (err) {
    console.error("[AI-SUGGEST] generateGroqIdeas failed:", err.message);
    return [];
  }
}

/* ------------------- MAIN AI SUGGEST ROUTE --------------------- */

app.post("/api/recipes/ai-suggest", async (req, res) => {
  const raw = req.body || {};
  try {
    const normalized = await normalizeInputsWithGroqSafe(raw);

    console.log("[AI-SUGGEST] normalized inputs:", normalized);

    // 1. Fetch candidates from all APIs (for suggestions only)
    const [edamam, spoon, meal] = await Promise.all([
      fetchEdamamCandidates(normalized, raw),
      fetchSpoonacularCandidates(normalized, raw),
      fetchMealDbCandidates(normalized, raw),
    ]);

    const allCandidates = [...edamam, ...spoon, ...meal];
    console.log(
      "[AI-SUGGEST] candidates from APIs:",
      allCandidates.length,
      `(Edamam: ${edamam.length} Spoonacular: ${spoon.length} MealDB: ${meal.length})`
    );

    // 2. Let Groq generate ONE main recipe (only AI, no API ranking)
    const groqMain = await generateGroqMainRecipe(normalized, raw);
    let mainRecipe = groqMain?.mainRecipe || null;
    const groqSuggestions = groqMain?.aiSuggestions || [];

    // 3. Build API-based suggestions (strict matches)
    let apiMatches = buildStrictMatches(allCandidates, normalized);

    // 3a. Ensure all API matches have images
    apiMatches = await Promise.all(apiMatches.map(ensureImageForRecipe));

    // 4. Ask Groq for extra ideas based on inputs & API matches
    let aiIdeas = await generateGroqIdeas(normalized, apiMatches);
    aiIdeas = await Promise.all(aiIdeas.map(ensureImageForRecipe));

    // 5. Build merged suggestions list (API matches + Groq suggestions)
    const groqSuggestionsWithImages = await Promise.all(
      groqSuggestions.map(async (s, idx) => {
        const base = {
          id: `groq-sugg-${idx}`,
          title: s.title || "AI suggestion",
          imageUrl: null,
          source: "ai-suggestion",
          totalTimeMinutes: safeNumber(s.totalTimeMinutes),
          dietLabels: s.diet ? [s.diet] : [],
          cuisines: s.cuisine ? [normalizeString(s.cuisine)] : [],
          ingredientsUsed: toArray(s.ingredientsUserHas),
          ingredientsMissing: toArray(s.ingredientsToBuy),
          ingredientsNotUsed: [],
        };
        return await ensureImageForRecipe(base);
      })
    );

    const mergedSuggestions = [...apiMatches, ...groqSuggestionsWithImages];

    // 6. Ensure main recipe has image
    if (mainRecipe) {
      mainRecipe = await ensureImageForRecipe(mainRecipe);
    }

    // 7. Put main recipe FIRST in searchMatches array (if we got one)
    const searchMatches = mainRecipe
      ? [mainRecipe, ...mergedSuggestions]
      : mergedSuggestions;

    res.json({
      normalized,
      searchMatches,
      aiIdeas, // used for the "AI chef ideas" section
    });
  } catch (err) {
    console.error("[AI-SUGGEST] exception:", err);
    res.status(500).json({
      error: "AI recipe suggestion failed",
      details: err?.message || "Unknown error",
    });
  }
});

/* ---------------- AUTOCOMPLETE ENDPOINTS ----------------------- */

/**
 * Ingredients autocomplete: original stubbed safe version
 * (kept for backwards compatibility, but overridden by the real one below).
 */
app.get("/api/ingredients/autocomplete", async (req, res) => {
  const q = (req.query.q || "").toString().trim();

  if (!q) {
    return res.json([]);
  }

  try {
    let finalSuggestions = [];

    if (!Array.isArray(finalSuggestions) || finalSuggestions.length === 0) {
      finalSuggestions = [
        {
          id: `custom-${q}`,
          name: q,
          imageUrl: null,
          source: "custom",
        },
      ];
    }

    res.json(finalSuggestions);
  } catch (err) {
    console.error("[ING-AUTO] unexpected error:", err);
    res.json([
      {
        id: `custom-${q}`,
        name: q,
        imageUrl: null,
        source: "custom",
      },
    ]);
  }
});

/**
 * Diet autocomplete: simple static list + fuzzy filter.
 */
const KNOWN_DIETS = [
  "vegetarian",
  "lacto vegetarian",
  "ovo vegetarian",
  "lacto ovo vegetarian",
  "vegan",
  "pescetarian",
  "gluten free",
  "ketogenic",
  "paleo",
  "whole30",
  "low carb",
  "low fat",
];

const SPOON_KEY = process.env.SPOONACULAR_API_KEY;

// Real Spoonacular ingredient autocomplete (with images)
app.get("/api/ingredients/autocomplete", async (req, res) => {
  const q = (req.query.q || "").toString().trim();

  if (!q || q.length < 2) {
    return res.json([]);
  }

  if (!SPOON_KEY) {
    console.error("[ING-AUTO] Missing SPOONACULAR_API_KEY in backend .env");
    return res.status(500).json({ error: "Spoonacular key not configured" });
  }

  try {
    const spoonUrl = `https://api.spoonacular.com/food/ingredients/autocomplete?apiKey=${SPOON_KEY}&number=10&query=${encodeURIComponent(
      q
    )}`;

    const response = await fetch(spoonUrl);
    if (!response.ok) {
      console.error("[ING-AUTO] Spoonacular HTTP", response.status);
      return res.status(500).json({ error: "Spoonacular request failed" });
    }

    const data = await response.json();

    const mapped = (data || []).map((item) => ({
      id: String(item.id ?? item.name),
      label: item.name,
      imageUrl: item.image
        ? `https://spoonacular.com/cdn/ingredients_100x100/${item.image}`
        : null,
      source: "spoonacular",
    }));

    res.json(mapped);
  } catch (err) {
    console.error("[ING-AUTO] Error", err);
    res.status(500).json({ error: "Ingredient autocomplete failed" });
  }
});

app.get("/api/diets/autocomplete", (req, res) => {
  const query = normalizeString(req.query.query || "");
  if (!query) {
    return res.json(
      KNOWN_DIETS.map((d, idx) => ({
        id: `diet-${idx}`,
        name: d,
      }))
    );
  }

  const matches = KNOWN_DIETS.filter((d) =>
    normalizeString(d).includes(query)
  );

  res.json(
    matches.map((d, idx) => ({
      id: `diet-${idx}`,
      name: d,
    }))
  );
});

/**
 * Cuisine autocomplete: static list + fuzzy.
 */
const KNOWN_CUISINES = [
  "indian",
  "italian",
  "mexican",
  "thai",
  "chinese",
  "japanese",
  "french",
  "spanish",
  "mediterranean",
  "middle eastern",
  "american",
  "british",
  "korean",
  "vietnamese",
];

app.get("/api/cuisines/autocomplete", (req, res) => {
  const query = normalizeString(req.query.query || "");
  if (!query) {
    return res.json(
      KNOWN_CUISINES.map((c, idx) => ({
        id: `cuisine-${idx}`,
        name: c,
      }))
    );
  }

  const matches = KNOWN_CUISINES.filter((c) =>
    normalizeString(c).includes(query)
  );

  res.json(
    matches.map((c, idx) => ({
      id: `cuisine-${idx}`,
      name: c,
    }))
  );
});

/* ---------- SIMPLE SPOONACULAR SEARCH (bottom section) --------- */

// Search recipes (Spoonacular) with optional diet + max time
app.get("/api/recipes/search", async (req, res) => {
  if (!SPOONACULAR_API_KEY) {
    return res.json({
      page: 1,
      pageSize: 0,
      totalResults: 0,
      results: [],
    });
  }

  const query = String(req.query.query || "dinner").trim();
  const diet = String(req.query.diet || "").trim(); // e.g. "vegetarian"
  const maxTimeRaw = req.query.maxTimeMinutes;
  const maxTime =
    maxTimeRaw != null && maxTimeRaw !== "" ? Number(maxTimeRaw) : null;

  console.log(
    "[SEARCH] incoming search:",
    query,
    "diet=",
    diet || "none",
    "maxTimeMinutes=",
    maxTime ?? "none"
  );

  // base params for Spoonacular
  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    query,
    number: "50", // grab a few extra, we'll filter here
    addRecipeInformation: "true",
  });

  if (diet) params.set("diet", diet);
  if (maxTime != null && !Number.isNaN(maxTime)) {
    params.set("maxReadyTime", String(maxTime));
  }

  try {
    const url = `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(
        "[SEARCH] Spoonacular error:",
        resp.status,
        await resp.text().catch(() => "")
      );
      return res.json({
        page: 1,
        pageSize: 0,
        totalResults: 0,
        results: [],
      });
    }

    const data = await resp.json();
    let results = Array.isArray(data.results) ? data.results : [];

    // extra diet safety on our side
    if (diet) {
      const d = diet.toLowerCase();
      results = results.filter((r) =>
        (r.diets || []).some((label) =>
          String(label).toLowerCase().includes(d)
        )
      );
    }

    // extra time safety on our side
    if (maxTime != null && !Number.isNaN(maxTime)) {
      results = results.filter((r) => {
        const ready =
          typeof r.readyInMinutes === "number"
            ? r.readyInMinutes
            : typeof r.cookingMinutes === "number"
            ? r.cookingMinutes
            : typeof r.preparationMinutes === "number"
            ? r.preparationMinutes
            : null;
        return ready == null || ready <= maxTime;
      });
    }

    const mapped = results.map((r) => {
      const ready =
        typeof r.readyInMinutes === "number"
          ? r.readyInMinutes
          : typeof r.cookingMinutes === "number"
          ? r.cookingMinutes
          : typeof r.preparationMinutes === "number"
          ? r.preparationMinutes
          : null;

      const thumbnailUrl =
        pickBestSpoonImage(r) ||
        (r.image ? upgradeSpoonacularUrl(r.image) : null);

      const dietLabel =
        Array.isArray(r.diets) && r.diets.length
          ? r.diets[0]
          : r.vegetarian
          ? "vegetarian"
          : null;

      return {
        recipeId: String(r.id),
        title: r.title,
        thumbnailUrl,
        estimatedTimeMinutes: ready,
        diet: dietLabel,
        rating:
          typeof r.spoonacularScore === "number" ? r.spoonacularScore : null,
      };
    });

    res.json({
      page: 1,
      pageSize: mapped.length,
      totalResults:
        typeof data.totalResults === "number"
          ? data.totalResults
          : mapped.length,
      results: mapped,
    });
  } catch (err) {
    console.error("[SEARCH] exception:", err.message);
    res.json({
      page: 1,
      pageSize: 0,
      totalResults: 0,
      results: [],
    });
  }
});





/**
 * Fetch full recipe details by id from Spoonacular.
 */
async function fetchSpoonacularRecipeDetailsAiShape(id) {
  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    includeNutrition: "true",
  });

  const url = `https://api.spoonacular.com/recipes/${id}/information?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(
      "[DETAIL] Spoonacular error:",
      resp.status,
      await resp.text().catch(() => "")
    );
    throw new Error("Not found");
  }

  const data = await resp.json();
  const extendedIngredients = toArray(data.extendedIngredients);

  // ingredients: string -> { quantity, name }
  const ingredients = extendedIngredients.map((i) => {
    const original = i.original || i.originalString || i.name || "";
    const parts = String(original).trim().split(/\s+/);
    if (parts.length <= 1) {
      return { quantity: original, name: original };
    }
    return {
      quantity: parts.slice(0, -1).join(" "),
      name: parts.slice(-1).join(" "),
    };
  });

  // steps
  let steps = [];
  if (Array.isArray(data.analyzedInstructions) && data.analyzedInstructions[0]) {
    steps = (data.analyzedInstructions[0].steps || [])
      .map((s) => s.step)
      .filter(Boolean);
  }
  if (!steps.length && typeof data.instructions === "string") {
    steps = data.instructions
      .split(/[\r\n]+/)
      .map((s) => s.replace(/^\s*\d+[\).\-\:]\s*/, "").trim())
      .filter(Boolean);
  }

  const ready =
    typeof data.readyInMinutes === "number"
      ? data.readyInMinutes
      : typeof data.cookingMinutes === "number"
      ? data.cookingMinutes
      : typeof data.preparationMinutes === "number"
      ? data.preparationMinutes
      : null;

  const dietLabel =
    Array.isArray(data.diets) && data.diets.length
      ? data.diets[0]
      : data.vegetarian
      ? "vegetarian"
      : null;

  const imageUrl = pickBestSpoonImage({
    id: data.id,
    image: data.image,
    imageType: data.imageType,
  });

  // <- This matches your AiRecipe type in page.tsx
  return {
    recipeId: String(data.id),
    title: data.title,
    summary: stripHtml(data.summary || ""),
    imageUrl,
    estimatedTimeMinutes: ready,
    servings: data.servings || null,
    diet: dietLabel,
    ingredients,
    steps,
  };
}


/**
 * Fetch full recipe details by id from Spoonacular (AI-friendly shape)
 */
app.get("/api/recipes/:id", async (req, res) => {
  if (!SPOONACULAR_API_KEY) {
    return res.status(404).json({ error: "Not available" });
  }

  try {
    const recipe = await fetchSpoonacularRecipeDetailsAiShape(req.params.id);
    res.json(recipe);
  } catch (err) {
    console.error("[DETAIL] exception:", err.message);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});



// Backwards-compatible alias for any old code still using /by-id/:id
app.get("/api/recipes/by-id/:id", async (req, res) => {
  if (!SPOONACULAR_API_KEY) {
    return res.status(404).json({ error: "Not available" });
  }

  try {
    const recipe = await fetchSpoonacularRecipeDetailsAiShape(req.params.id);
    res.json(recipe);
  } catch (err) {
    console.error("[DETAIL] exception (by-id):", err.message);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});


/* ---------------------------- ROOT ----------------------------- */

app.get("/", (req, res) => {
  res.send("✅ AI Recipe API listening on http://localhost:" + PORT);
});

/* -------------------------- START ------------------------------ */

app.listen(PORT, () => {
  console.log(`✅ AI Recipe API listening on http://localhost:${PORT}`);
});
