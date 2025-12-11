require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// SPOONACULAR SETUP
const SPOON_KEY = process.env.SPOONACULAR_API_KEY;
const spoon = axios.create({
  baseURL: 'https://api.spoonacular.com',
  params: { apiKey: SPOON_KEY }
});

// SIMPLE IN-MEMORY DATA (real recipes come from Spoonacular)
let favorites = [];   // { userId, recipeId, title, imageUrl, estimatedTimeMinutes, favoritedAt }
let mealPlans = [];   // { mealPlanId, userId, startDate, endDate, meals[], createdAt }

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// helper: map Spoonacular "information" object into our recipe shape
function mapSpoonRecipe(info) {
  const ingredients = (info.extendedIngredients || []).map(i => ({
    name: i.name,
    quantity: i.original
  }));

  let steps = [];
  if (Array.isArray(info.analyzedInstructions) && info.analyzedInstructions.length > 0) {
    steps = info.analyzedInstructions[0].steps.map(s => s.step);
  }

  return {
    recipeId: String(info.id),
    title: info.title,
    summary: info.summary || '',
    ingredients,
    steps,
    estimatedTimeMinutes: info.readyInMinutes || null,
    servings: info.servings || null,
    nutrition: null, // you can map nutrition.nutrients if you want
    imageUrl: info.image || null,
    diet: (info.diets && info.diets[0]) || null,
    rating: null,
    ratingsCount: null
  };
}

/**
 * 1) AI RECIPE SUGGESTION
 * POST /api/recipes/ai-suggest
 */
app.post('/api/recipes/ai-suggest', async (req, res) => {
  const { ingredients, diet, cuisine, maxTimeMinutes, servings, mood } = req.body || {};

  try {
    const params = {
      number: 1,
      addRecipeInformation: true,
      fillIngredients: true
    };

    if (ingredients && ingredients.length > 0) {
      params.includeIngredients = ingredients.join(',');
    }
    if (diet) params.diet = diet;
    if (cuisine) params.cuisine = cuisine;
    if (maxTimeMinutes) params.maxReadyTime = maxTimeMinutes;

    const response = await spoon.get('/recipes/complexSearch', { params });

    if (!response.data.results || response.data.results.length === 0) {
      return res.status(404).json({ error: 'No recipe found for given preferences' });
    }

    const base = response.data.results[0];

    // Get full information (including steps, ingredients)
    const infoResp = await spoon.get(`/recipes/${base.id}/information`, {
      params: { includeNutrition: false }
    });

    const fullRecipe = mapSpoonRecipe(infoResp.data);
    if (servings) fullRecipe.servings = servings;

    res.json(fullRecipe);
  } catch (err) {
    console.error('Error in ai-suggest:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to generate AI-style recipe suggestion' });
  }
});

/**
 * 2) SEARCH RECIPES
 * GET /api/recipes/search?q=&diet=&maxTimeMinutes=&page=&pageSize=
 */
app.get('/api/recipes/search', async (req, res) => {
  const { q, diet, maxTimeMinutes, page = 1, pageSize = 10 } = req.query;

  try {
    const pageNum = Number(page);
    const sizeNum = Number(pageSize);

    const params = {
      query: q || '',
      diet: diet || undefined,
      maxReadyTime: maxTimeMinutes || undefined,
      number: sizeNum,
      offset: (pageNum - 1) * sizeNum,
      addRecipeInformation: true
    };

    const response = await spoon.get('/recipes/complexSearch', { params });

    const results = (response.data.results || []).map(r => ({
      recipeId: String(r.id),
      title: r.title,
      thumbnailUrl: r.image,
      estimatedTimeMinutes: r.readyInMinutes || null,
      diet: (r.diets && r.diets[0]) || null,
      rating: null
    }));

    res.json({
      page: pageNum,
      pageSize: sizeNum,
      totalResults: response.data.totalResults || results.length,
      results
    });
  } catch (err) {
    console.error('Error in search:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to search recipes' });
  }
});

/**
 * 3) GET RECIPE DETAILS
 * GET /api/recipes/:recipeId
 */
app.get('/api/recipes/:recipeId', async (req, res) => {
  const { recipeId } = req.params;

  try {
    const infoResp = await spoon.get(`/recipes/${recipeId}/information`, {
      params: { includeNutrition: false }
    });

    const recipe = mapSpoonRecipe(infoResp.data);
    res.json(recipe);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    console.error('Error in recipe details:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to load recipe details' });
  }
});

/**
 * 4) ADD RECIPE TO FAVORITES
 * POST /api/users/:userId/favorites
 * body: { recipeId }
 */
app.post('/api/users/:userId/favorites', async (req, res) => {
  const { userId } = req.params;
  const { recipeId } = req.body || {};

  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' });
  }

  const existing = favorites.find(f => f.userId === userId && f.recipeId === String(recipeId));
  if (existing) {
    return res.status(200).json(existing);
  }

  try {
    const infoResp = await spoon.get(`/recipes/${recipeId}/information`, {
      params: { includeNutrition: false }
    });
    const r = infoResp.data;

    const fav = {
      userId,
      recipeId: String(recipeId),
      title: r.title,
      imageUrl: r.image || null,
      estimatedTimeMinutes: r.readyInMinutes || null,
      favoritedAt: new Date().toISOString()
    };

    favorites.push(fav);
    res.status(201).json(fav);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Recipe not found in Spoonacular' });
    }
    console.error('Error in add favorite:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

/**
 * 5) GET USER FAVORITES
 * GET /api/users/:userId/favorites?page=&pageSize=
 */
app.get('/api/users/:userId/favorites', (req, res) => {
  const { userId } = req.params;
  const { page = 1, pageSize = 10 } = req.query;

  const userFavs = favorites.filter(f => f.userId === userId);

  const pageNum = Number(page);
  const sizeNum = Number(pageSize);
  const start = (pageNum - 1) * sizeNum;
  const end = start + sizeNum;
  const pagedFavs = userFavs.slice(start, end);

  res.json({
    userId,
    page: pageNum,
    pageSize: sizeNum,
    totalResults: userFavs.length,
    favorites: pagedFavs
  });
});

/**
 * 6) CREATE MEAL PLAN
 * POST /api/users/:userId/meal-plans
 * body: { startDate, endDate, meals: [{date, timeOfDay, recipeId}] }
 */
app.post('/api/users/:userId/meal-plans', async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate, meals } = req.body || {};

  if (!startDate || !endDate || !Array.isArray(meals)) {
    return res.status(400).json({ error: 'startDate, endDate and meals are required' });
  }

  const mealPlanId = generateId('mp');

  // optional: validate that recipeIds exist in Spoonacular (skip for now to save quota)

  const mealPlan = {
    mealPlanId,
    userId,
    startDate,
    endDate,
    meals, // keep as { date, timeOfDay, recipeId }
    createdAt: new Date().toISOString()
  };

  mealPlans.push(mealPlan);
  res.status(201).json(mealPlan);
});

/**
 * 7) GET MEAL PLAN FOR A SINGLE DAY
 * GET /api/users/:userId/meal-plans?date=YYYY-MM-DD
 */
app.get('/api/users/:userId/meal-plans', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
  }

  const userPlans = mealPlans.filter(mp => mp.userId === userId);

  const mealsForDate = [];
  userPlans.forEach(mp => {
    mp.meals.forEach(m => {
      if (m.date === date) {
        mealsForDate.push({
          timeOfDay: m.timeOfDay,
          recipeId: m.recipeId
        });
      }
    });
  });

  // fill in title + image by calling Spoonacular
  const enriched = [];
  for (const meal of mealsForDate) {
    try {
      const infoResp = await spoon.get(`/recipes/${meal.recipeId}/information`, {
        params: { includeNutrition: false }
      });
      const r = infoResp.data;
      enriched.push({
        timeOfDay: meal.timeOfDay,
        recipeId: String(meal.recipeId),
        title: r.title,
        thumbnailUrl: r.image || null
      });
    } catch (err) {
      enriched.push({
        timeOfDay: meal.timeOfDay,
        recipeId: String(meal.recipeId),
        title: 'Unknown Recipe',
        thumbnailUrl: null
      });
    }
  }

  res.json({
    userId,
    date,
    meals: enriched
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Chefora API (Spoonacular) running on http://localhost:${PORT}`);
});
