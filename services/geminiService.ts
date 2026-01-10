// At the top of the file, add proper error handling
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY');
}

// Then wherever you use it (around line 50), do:
const apiKey = GEMINI_API_KEY || '';

// Or better, throw an error early:
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required');
}
/**
 * JobFlow AI Sync Diagnostic Service
 * This service is purely functional to avoid any top-level execution errors.
 */
export async function analyzeSyncIssue(context: string) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured.");
  }

  // We import dynamically to prevent the SDK from initializing before we have checked the API Key.
  const { GoogleGenAI, Type } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a senior systems architect. Solve this Clerk-to-Neon sync issue for JobFlow AI.
    
    USER PROBLEM:
    - User is created in Clerk but not in Neon database.
    - User sees old session data even after deleting Neon rows.
    
    TECHNICAL CAUSE:
    1. The Clerk 'user.created' webhook is likely missing or failing.
    2. Stale data persists because Clerk JWTs (sessions) in the browser are independent of the Neon Postgres state.
    
    OUTPUT JSON FORMAT:
    {
      "explanation": "Brief clear text explaining the disconnect.",
      "routeHandler": "Full Next.js code for api/webhooks/clerk/route.ts using svix and drizzle or prisma (whichever fits a Neon setup).",
      "steps": ["Step 1...", "Step 2..."]
    }
    
    Context: ${context}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          routeHandler: { type: Type.STRING },
          steps: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["explanation", "routeHandler", "steps"]
      }
    }
  });

  return JSON.parse(response.text);
}

