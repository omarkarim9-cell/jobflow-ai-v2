// services/geminiService.ts

/**
 * JobFlow AI Gemini Service
 */

// Get API key from environment
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Validate API key exists
if (!GEMINI_API_KEY) {
  console.error('Missing VITE_GEMINI_API_KEY environment variable');
}

export async function analyzeSyncIssue(context: string) {
  // Check API key before making request
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is missing. Please configure it in your environment variables.");
  }

  try {
    // Import Google Generative AI
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    });

    const prompt = `You are a senior systems architect. Solve this Clerk-to-Neon sync issue for JobFlow AI.
    
USER PROBLEM:
- User is created in Clerk but not in Neon database.
- User sees old session data even after deleting Neon rows.

TECHNICAL CAUSE:
1. The Clerk 'user.created' webhook is likely missing or failing.
2. Stale data persists because Clerk JWTs (sessions) in the browser are independent of the Neon Postgres state.

OUTPUT JSON FORMAT:
{
  "explanation": "Brief clear text explaining the disconnect.",
  "routeHandler": "Full API route code for api/webhooks/clerk.ts using svix and neon",
  "steps": ["Step 1...", "Step 2..."]
}

Context: ${context}

Return ONLY valid JSON, no markdown or code blocks.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up response (remove markdown if present)
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Failed to analyze sync issue: ${error}`);
  }
}

// Add other helper functions if needed
export async function generateCoverLetter(jobData: any, resumeData: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is missing");
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate a professional cover letter for this job:\n${JSON.stringify(jobData)}\n\nResume: ${resumeData}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}
