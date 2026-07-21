import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    const results = {
      groq: {
        configured: !!GROQ_API_KEY,
        keyLength: GROQ_API_KEY?.length || 0,
        tested: false,
        working: false,
        error: null as string | null,
      },
      gemini: {
        configured: !!GEMINI_API_KEY,
        keyLength: GEMINI_API_KEY?.length || 0,
        tested: false,
        working: false,
        error: null as string | null,
        modelUsed: null as string | null,
      },
    };

    if (GEMINI_API_KEY) {
      results.gemini.tested = true;
      const geminiModels = [
        'gemini-2.5-flash',           
        'gemini-2.5-flash-lite',      
        'gemini-2.5-pro',             
        'gemini-1.5-flash',           
        'gemini-1.5-pro',             
      ];
      
      for (const model of geminiModels) {
        try {
          const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'Say "Hello" in one word.' }],
              }],
              generationConfig: {
                maxOutputTokens: 10,
              },
            }),
          });

          if (testResponse.ok) {
            const data = await testResponse.json();
            if (data.candidates?.[0]?.content) {
              results.gemini.working = true;
              results.gemini.error = null;
              results.gemini.modelUsed = model; 
              break; 
            } else {
              results.gemini.error = `Model ${model}: No response content`;
            }
          } else {
            const errorText = await testResponse.text().catch(() => 'Unknown error');
            results.gemini.error = `Model ${model}: HTTP ${testResponse.status} - ${errorText.substring(0, 100)}`;
            
          }
        } catch (error: any) {
          results.gemini.error = `Model ${model}: ${error?.message || 'Network error'}`;
          
        }
      }
      
      if (!results.gemini.working && results.gemini.error) {
        results.gemini.error = `All models failed. Last: ${results.gemini.error}`;
      }
    }

    if (GROQ_API_KEY) {
      try {
        results.groq.tested = true;
        const testResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant', 
            messages: [{ role: 'user', content: 'Say "Hello"' }],
            max_tokens: 10,
          }),
        });

        if (testResponse.ok) {
          const data = await testResponse.json();
          if (data.choices?.[0]?.message) {
            results.groq.working = true;
          } else {
            results.groq.error = 'No response content';
          }
        } else {
          const errorText = await testResponse.text().catch(() => 'Unknown error');
          results.groq.error = `HTTP ${testResponse.status}: ${errorText.substring(0, 100)}`;
        }
      } catch (error: any) {
        results.groq.error = error?.message || 'Network error';
      }
    }

    return NextResponse.json({
      message: 'AI API Test Results',
      results,
      instructions: !GEMINI_API_KEY && !GROQ_API_KEY
        ? 'Add GEMINI_API_KEY or GROQ_API_KEY to .env.local and restart the dev server'
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      message: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}
