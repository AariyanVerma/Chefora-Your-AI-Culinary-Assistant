import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipeTitle, description, existingIngredients, existingSteps, servings, difficulty, cuisine, diet } = body;

    if (!recipeTitle) {
      return NextResponse.json({ error: 'Recipe title is required' }, { status: 400 });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    // Log API key availability (without exposing the actual keys)
    console.log('[Dashboard] AI API keys status:', {
      groq: !!GROQ_API_KEY,
      gemini: !!GEMINI_API_KEY,
      groqLength: GROQ_API_KEY?.length || 0,
      geminiLength: GEMINI_API_KEY?.length || 0,
    });

    // Try Groq first, then Gemini
    let aiResponse = null;

    // Try Groq API
    if (GROQ_API_KEY) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant', // Updated to current model (llama-3.1-70b-versatile was decommissioned)
            messages: [
              {
                role: 'system',
                content: 'You are a helpful cooking assistant that generates detailed, beginner-friendly recipe ingredients and instructions. Always provide exact quantities and measurements.',
              },
              {
                role: 'user',
                content: `You are a patient cooking instructor teaching a complete beginner with ZERO kitchen experience. Generate VERY DETAILED ingredients with EXACT quantities and EXTREMELY detailed, step-by-step cooking instructions for "${recipeTitle}".

${description ? `Recipe description: ${description}` : ''}
${servings ? `Target servings: ${servings}` : ''}
${difficulty ? `Difficulty level: ${difficulty}` : ''}
${cuisine ? `Cuisine type: ${cuisine}` : ''}
${diet ? `Dietary restriction: ${diet}` : ''}

${existingIngredients && existingIngredients.length > 0 ? `Current ingredients list (INCOMPLETE - needs exact quantities): ${existingIngredients.map((ing: any) => {
  const name = ing.name || ing;
  const qty = ing.quantity || 'missing';
  return `${name} (${qty === 'missing' ? 'QUANTITY NEEDED' : qty})`;
}).join(', ')}` : ''}

${existingSteps && existingSteps.length > 0 ? `Current instructions (TOO BRIEF - need more detail): ${existingSteps.join(' | ')}` : ''}

CRITICAL REQUIREMENTS FOR BEGINNERS:

1. INGREDIENTS - MUST include EXACT quantities for EVERYTHING:
   - Every spice needs exact measurement: "1/2 tsp salt", "1/4 tsp turmeric", "2 tsp red chili powder"
   - Every vegetable needs quantity: "1 medium onion", "4 garlic cloves", "1 inch piece of ginger"
   - Every liquid needs measurement: "2 tbsp oil", "1 cup water"
   - Every ingredient must have a quantity - NEVER write "as needed" or "to taste" without also giving a starting amount
   - Include preparation state if needed: "1 cup cooked rice", "1 cup uncooked rice"

2. INSTRUCTIONS - MUST be EXTREMELY detailed for complete beginners:
   - Each step should be broken into smaller sub-steps
   - Explain HOW to do each action: "Heat 2 tbsp of oil" not just "heat oil"
   - Specify EXACT amounts in each step: "Add 1/2 tsp salt" not just "add salt"
   - Include temperatures: "Heat oil over medium heat (turn stove knob to 5-6 on a 1-10 scale)"
   - Include timing: "Cook for 3-4 minutes, stirring every 30 seconds"
   - Include visual cues: "Cook until onions turn translucent (you can see through them slightly, about 3-4 minutes)"
   - Include doneness tests: "Check if vegetables are tender by poking with a fork - it should go through easily"
   - Include safety tips: "Be careful of hot oil splattering"
   - Explain cooking terms: "Sauté means to cook while stirring frequently over medium heat"

Example of GOOD detailed instruction:
"Step 1: Heat 2 tablespoons (tbsp) of cooking oil in a large pan over medium heat. To set medium heat, turn your stove knob to position 5 or 6 on a scale of 1-10. Wait 1-2 minutes for the oil to heat up - you'll know it's ready when you see small ripples or a slight shimmer in the oil. Then add 1 medium-sized onion (diced into small pieces), 4 cloves of garlic (minced), and 1 inch piece of ginger (grated or minced). Cook for 3-4 minutes, stirring every 30 seconds with a spatula, until the onions turn translucent (you can see through them slightly). The mixture should smell fragrant."

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "ingredients": [
    {"name": "ingredient name", "quantity": "exact quantity with units - NEVER 'as needed' or vague amounts"},
    {"name": "Salt", "quantity": "1/2 tsp"},
    {"name": "Turmeric", "quantity": "1/4 tsp"},
    {"name": "Red chili powder", "quantity": "1 tsp"}
  ],
  "steps": [
    "Very detailed step 1 with exact quantities and beginner explanations",
    "Very detailed step 2 with exact quantities and beginner explanations",
    ...
  ]
}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiResponse = JSON.parse(jsonMatch[0]);
              console.log('[Dashboard] Successfully generated recipe details using Groq API');
            } else {
              console.warn('[Dashboard] Groq response does not contain valid JSON');
            }
          } else {
            console.warn('[Dashboard] Groq response has no content');
          }
        } else {
          const errorText = await groqResponse.text().catch(() => 'Unknown error');
          console.error('[Dashboard] Groq API HTTP error:', groqResponse.status, errorText);
        }
      } catch (groqError: any) {
        console.error('[Dashboard] Groq API error:', groqError?.message || groqError);
      }
    }

    // If Groq failed, try Gemini
    if (!aiResponse && GEMINI_API_KEY) {
      console.log('[Dashboard] Attempting to use Gemini API...');
      try {
        const prompt = `You are a patient cooking instructor teaching a complete beginner with ZERO kitchen experience. Generate VERY DETAILED ingredients with EXACT quantities and EXTREMELY detailed, step-by-step cooking instructions for "${recipeTitle}".

${description ? `Recipe description: ${description}` : ''}
${servings ? `Target servings: ${servings}` : ''}
${difficulty ? `Difficulty level: ${difficulty}` : ''}
${cuisine ? `Cuisine type: ${cuisine}` : ''}
${diet ? `Dietary restriction: ${diet}` : ''}

${existingIngredients && existingIngredients.length > 0 ? `Current ingredients list (INCOMPLETE - needs exact quantities): ${existingIngredients.map((ing: any) => {
  const name = ing.name || ing;
  const qty = ing.quantity || 'missing';
  return `${name} (${qty === 'missing' || qty.includes('as needed') ? 'QUANTITY NEEDED' : qty})`;
}).join(', ')}` : ''}

${existingSteps && existingSteps.length > 0 ? `Current instructions (TOO BRIEF - need much more detail): ${existingSteps.join(' | ')}` : ''}

CRITICAL REQUIREMENTS FOR BEGINNERS:

1. INGREDIENTS - MUST include EXACT quantities for EVERYTHING:
   - Every spice needs exact measurement: "1/2 tsp salt", "1/4 tsp turmeric", "2 tsp red chili powder"
   - Every vegetable needs quantity: "1 medium onion", "4 garlic cloves", "1 inch piece of ginger"
   - Every liquid needs measurement: "2 tbsp oil", "1 cup water"
   - Every ingredient must have a quantity - NEVER write "as needed" or "quantity as needed"
   - Include preparation state if needed: "1 cup cooked rice", "1 cup uncooked rice"

2. INSTRUCTIONS - MUST be EXTREMELY detailed for complete beginners:
   - Each step should explain HOW to do each action with exact amounts
   - Specify EXACT amounts in each step: "Add 1/2 tsp salt" not just "add salt"
   - Include temperatures: "Heat oil over medium heat (turn stove knob to 5-6 on a 1-10 scale)"
   - Include timing: "Cook for 3-4 minutes, stirring every 30 seconds"
   - Include visual cues: "Cook until onions turn translucent (you can see through them slightly, about 3-4 minutes)"
   - Include doneness tests: "Check if vegetables are tender by poking with a fork - it should go through easily"
   - Explain cooking terms: "Sauté means to cook while stirring frequently over medium heat"

Example of GOOD detailed instruction:
"Step 1: Heat 2 tablespoons (tbsp) of cooking oil in a large pan over medium heat. To set medium heat, turn your stove knob to position 5 or 6 on a scale of 1-10. Wait 1-2 minutes for the oil to heat up - you'll know it's ready when you see small ripples or a slight shimmer in the oil. Then add 1 medium-sized onion (diced into small pieces), 4 cloves of garlic (minced), and 1 inch piece of ginger (grated or minced). Cook for 3-4 minutes, stirring every 30 seconds with a spatula, until the onions turn translucent (you can see through them slightly). The mixture should smell fragrant."

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "ingredients": [
    {"name": "ingredient name", "quantity": "exact quantity with units - NEVER 'as needed'"},
    {"name": "Salt", "quantity": "1/2 tsp"},
    {"name": "Turmeric", "quantity": "1/4 tsp"}
  ],
  "steps": [
    "Very detailed step 1 with exact quantities and beginner explanations",
    "Very detailed step 2 with exact quantities and beginner explanations"
  ]
}`;

        // Use the v1 API endpoint - try different model names if one fails
        // Try multiple model names in order of preference - current Gemini 2.5 models
        const modelNames = [
          'gemini-2.5-flash',         // Latest flash model (recommended for speed)
          'gemini-2.5-flash-lite',    // Latest lightweight model (cost-effective)
          'gemini-2.5-pro',           // Latest pro model (best quality)
          'gemini-1.5-flash',         // Fallback to 1.5 flash
          'gemini-1.5-pro',           // Fallback to 1.5 pro
        ];
        
        let geminiResponse = null;
        let lastError = null;
        
        for (const model of modelNames) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            console.log(`[Dashboard] Trying Gemini model: ${model}`);
            
            geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: prompt }],
                  role: 'user',
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 2000,
                },
              }),
            });
            
            if (geminiResponse.ok) {
              console.log(`[Dashboard] ✅ Successfully connected to Gemini model: ${model}`);
              break; // Success! Exit the loop
            } else {
              const errorText = await geminiResponse.text().catch(() => 'Unknown error');
              lastError = `Model ${model}: HTTP ${geminiResponse.status} - ${errorText.substring(0, 100)}`;
              console.warn(`[Dashboard] Model ${model} failed:`, geminiResponse.status);
              // Try next model
              geminiResponse = null;
            }
          } catch (error: any) {
            lastError = `Model ${model}: ${error?.message || 'Network error'}`;
            console.warn(`[Dashboard] Error trying model ${model}:`, error?.message);
            // Try next model
            geminiResponse = null;
          }
        }
        
        if (geminiResponse && geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log('[Dashboard] Gemini API response received, content length:', content?.length || 0);
          if (content) {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                aiResponse = JSON.parse(jsonMatch[0]);
                console.log('[Dashboard] ✅ Successfully generated recipe details using Gemini API');
                console.log('[Dashboard] AI generated', aiResponse.ingredients?.length || 0, 'ingredients and', aiResponse.steps?.length || 0, 'steps');
              } catch (parseError: any) {
                console.error('[Dashboard] ❌ Failed to parse Gemini JSON response:', parseError?.message);
                console.error('[Dashboard] Raw content snippet:', content.substring(0, 300));
              }
            } else {
              console.warn('[Dashboard] ❌ No JSON found in Gemini response');
              console.warn('[Dashboard] Content preview:', content.substring(0, 200));
            }
          } else {
            console.warn('[Dashboard] ❌ No content in Gemini API response');
            console.warn('[Dashboard] Response structure:', JSON.stringify(geminiData, null, 2).substring(0, 500));
          }
        } else if (lastError) {
          // All models failed
          console.error('[Dashboard] ❌ All Gemini models failed to connect');
          console.error('[Dashboard] Last error:', lastError);
          console.error('[Dashboard] Tried models:', modelNames.join(', '));
        }
      } catch (geminiError: any) {
        console.error('[Dashboard] Gemini API network/request error:', geminiError?.message || geminiError);
        if (geminiError?.cause) {
          console.error('[Dashboard] Error cause:', geminiError.cause);
        }
      }
    } else if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      console.warn('[Dashboard] No AI API keys configured! Please set GEMINI_API_KEY or GROQ_API_KEY in .env.local');
    }

    // If both APIs failed, return a partial response with existing data enhanced as much as possible
    if (!aiResponse) {
      console.warn('[Dashboard] Both Groq and Gemini APIs failed or are not configured', {
        groqConfigured: !!GROQ_API_KEY,
        geminiConfigured: !!GEMINI_API_KEY,
      });
      
      // Try to enhance existing ingredients by adding reasonable default quantities
      const enhancedIngredients = existingIngredients?.map((ing: any) => {
        const name = typeof ing === 'string' ? ing : (ing.name || '');
        let quantity = typeof ing === 'string' ? '' : (ing.quantity || '');
        
        // If quantity is missing or vague, provide reasonable defaults based on ingredient name
        if (!quantity || quantity.toLowerCase().includes('as needed') || quantity.toLowerCase().includes('to taste')) {
          const nameLower = name.toLowerCase();
          
          // Provide default quantities based on common ingredient patterns
          if (nameLower.includes('salt')) quantity = '1/2 tsp';
          else if (nameLower.includes('pepper') || nameLower.includes('black pepper')) quantity = '1/4 tsp';
          else if (nameLower.includes('turmeric')) quantity = '1/4 tsp';
          else if (nameLower.includes('chili') || nameLower.includes('red chili')) quantity = '1 tsp';
          else if (nameLower.includes('cumin')) quantity = '1/2 tsp';
          else if (nameLower.includes('garlic')) quantity = '3-4 cloves';
          else if (nameLower.includes('ginger')) quantity = '1 inch piece';
          else if (nameLower.includes('onion')) quantity = '1 medium';
          else if (nameLower.includes('oil')) quantity = '2 tbsp';
          else if (nameLower.includes('water')) quantity = '1 cup';
          else if (nameLower.includes('rice') && !nameLower.includes('cooked')) quantity = '1 cup';
          else if (nameLower.includes('rice') && nameLower.includes('cooked')) quantity = '2 cups';
          else if (nameLower.includes('tomato')) quantity = '2 medium';
          else if (nameLower.includes('spinach')) quantity = '2 cups';
          else if (nameLower.includes('vegetable')) quantity = '1 cup';
          else quantity = 'as needed (check recipe description)';
        }
        
        return { name, quantity };
      }) || [];
      
      // Enhance existing steps with basic clarifications
      const enhancedSteps = existingSteps?.map((step: string) => {
        if (step.length < 30) {
          // Add basic clarifications for very short steps
          if (step.toLowerCase().includes('heat') && !step.includes('medium')) {
            return step + ' (use medium heat)';
          }
          if (step.toLowerCase().includes('cook') && !/\d/.test(step)) {
            return step + ' (cook until done, checking every few minutes)';
          }
          if (step.toLowerCase().includes('add') && !step.includes('amount')) {
            return step + ' (use quantities from ingredients list)';
          }
        }
        return step;
      }) || [];
      
      // Return partial enhancement (better than nothing)
      return NextResponse.json({
        ingredients: enhancedIngredients.length > 0 ? enhancedIngredients : existingIngredients || [],
        steps: enhancedSteps.length > 0 ? enhancedSteps : existingSteps || [],
        partial: true, // Flag to indicate this is a fallback, not full AI generation
        error: 'AI enhancement unavailable - using basic enhancements. Please check GROQ_API_KEY or GEMINI_API_KEY configuration.',
      });
    }

    // Validate and format the response
    const ingredients = Array.isArray(aiResponse.ingredients) 
      ? aiResponse.ingredients.map((ing: any) => ({
          name: typeof ing === 'string' ? ing : (ing.name || ''),
          quantity: typeof ing === 'string' ? '' : (ing.quantity || ing.amount || ''),
        })).filter((ing: any) => ing.name && ing.name.length > 0)
      : [];

    const steps = Array.isArray(aiResponse.steps)
      ? aiResponse.steps.filter((step: any) => step && typeof step === 'string' && step.trim().length > 0)
      : [];

    return NextResponse.json({
      ingredients,
      steps,
      partial: false,
    });

  } catch (error: any) {
    console.error('[Dashboard] Error enhancing recipe:', error);
    
    // Even on error, try to return enhanced existing data
    const enhancedIngredients = existingIngredients?.map((ing: any) => {
      const name = typeof ing === 'string' ? ing : (ing.name || '');
      const quantity = typeof ing === 'string' ? '' : (ing.quantity || '');
      return { name, quantity: quantity || 'check recipe' };
    }) || [];
    
    return NextResponse.json({ 
      ingredients: enhancedIngredients,
      steps: existingSteps || [],
      partial: true,
      error: 'Error generating enhanced recipe details',
    }, { status: 500 });
  }
}




