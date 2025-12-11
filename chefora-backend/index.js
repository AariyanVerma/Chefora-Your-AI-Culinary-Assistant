// chefora-backend/index.js

const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const SPOON_KEY = process.env.SPOONACULAR_API_KEY;

// --- CORS + logging ---
app.use(cors());                  // allow all origins in dev
app.use(express.json());

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// --- Health check route ---
app.get("/", (req, res) => {
  res.send("Chefora Spoonacular API is running ✅");
  console.log("Spoon key loaded?", !!SPOON_KEY);
});

// --- Search recipes ---
app.get("/api/recipes/search", async (req, res) => {
  const { q, diet, maxTimeMinutes, page = 1, pageSize = 10 } = req.query;

  try {
    const params = {
      apiKey: SPOON_KEY,
      query: q || "pasta",
      number: pageSize,
      offset: (Number(page) - 1) * Number(pageSize),
      addRecipeInformation: true,
    };

    if (diet) params.diet = diet;
    if (maxTimeMinutes) params.maxReadyTime = maxTimeMinutes;

    const response = await axios.get(
      "https://api.spoonacular.com/recipes/complexSearch",
      { params }
    );

    const data = response.data;

    const results = (data.results || []).map((r) => ({
      recipeId: String(r.id),
      title: r.title,
      thumbnailUrl: r.image || null,
      estimatedTimeMinutes: r.readyInMinutes || null,
      diet:
        (r.diets && r.diets.length > 0 ? r.diets[0] : null) ||
        (r.vegetarian ? "vegetarian" : null),
      rating: null,
    }));

    res.json({
      page: Number(page),
      pageSize: Number(pageSize),
      totalResults: data.totalResults || results.length,
      results,
    });
  } catch (err) {
    console.error("Error in search:", err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: "Failed to search recipes" });
  }
});

// --- Get recipe details by ID ---
app.get("/api/recipes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(
      `https://api.spoonacular.com/recipes/${id}/information`,
      {
        params: {
          apiKey: SPOON_KEY,
          includeNutrition: false,
        },
      }
    );

    const r = response.data;

    res.json({
      recipeId: String(r.id),
      title: r.title,
      summary: r.summary,
      imageUrl: r.image || null,
      estimatedTimeMinutes: r.readyInMinutes || null,
      servings: r.servings || null,
      diet:
        (r.diets && r.diets.length > 0 ? r.diets[0] : null) ||
        (r.vegetarian ? "vegetarian" : null),
      ingredients: (r.extendedIngredients || []).map((ing) => ({
        name: ing.originalName || ing.name,
        quantity: ing.original || "",
      })),
      steps:
        r.analyzedInstructions &&
        r.analyzedInstructions[0] &&
        Array.isArray(r.analyzedInstructions[0].steps)
          ? r.analyzedInstructions[0].steps.map((s) => s.step)
          : [],
    });
  } catch (err) {
    console.error("Error in details:", err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: "Failed to load recipe details" });
  }
});

// --- AI-style suggest recipe ---
app.post("/api/recipes/ai-suggest", async (req, res) => {
  const { ingredients, diet, cuisine, maxTimeMinutes, servings, mood } =
    req.body || {};

  try {
    const queryParts = [];

    if (Array.isArray(ingredients) && ingredients.length > 0) {
      queryParts.push(ingredients.join(" "));
    }
    if (mood) {
      queryParts.push(mood);
    }

    let query = queryParts.join(" ");
    if (!query) query = "quick dinner";

    const baseParams = {
      apiKey: SPOON_KEY,
      number: 1,
      addRecipeInformation: true,
    };

    const params = { ...baseParams, query };
    if (diet) params.diet = diet;
    if (cuisine) params.cuisine = cuisine;
    if (maxTimeMinutes) params.maxReadyTime = maxTimeMinutes;

    let response = await axios.get(
      "https://api.spoonacular.com/recipes/complexSearch",
      { params }
    );

    let [first] = response.data.results || [];

    if (!first) {
      const fallbackParams = { ...baseParams, query: "dinner" };
      const fallbackRes = await axios.get(
        "https://api.spoonacular.com/recipes/complexSearch",
        { params: fallbackParams }
      );
      first = (fallbackRes.data.results || [])[0];
    }

    if (!first) {
      return res.json({
        recipeId: "0",
        title: "No recipe found, try changing your ingredients.",
        summary: null,
        imageUrl: null,
        estimatedTimeMinutes: null,
        servings: servings || null,
        diet: null,
        ingredients: [],
        steps: [],
      });
    }

    const detailRes = await axios.get(
      `https://api.spoonacular.com/recipes/${first.id}/information`,
      {
        params: {
          apiKey: SPOON_KEY,
          includeNutrition: false,
        },
      }
    );

    const r = detailRes.data;

    res.json({
      recipeId: String(r.id),
      title: r.title,
      summary: r.summary,
      imageUrl: r.image || null,
      estimatedTimeMinutes: r.readyInMinutes || null,
      servings: servings || r.servings || null,
      diet:
        (r.diets && r.diets.length > 0 ? r.diets[0] : null) ||
        (r.vegetarian ? "vegetarian" : null),
      ingredients: (r.extendedIngredients || []).map((ing) => ({
        name: ing.originalName || ing.name,
        quantity: ing.original || "",
      })),
      steps:
        r.analyzedInstructions &&
        r.analyzedInstructions[0] &&
        Array.isArray(r.analyzedInstructions[0].steps)
          ? r.analyzedInstructions[0].steps.map((s) => s.step)
          : [],
    });
  } catch (err) {
    console.error("Error in ai-suggest:", err.response?.status, err.response?.data || err.message);
    res.status(500).json({ error: "Failed to generate AI recipe" });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Chefora API (Spoonacular) running on http://localhost:${PORT}`);
});
