import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeSyncIssue(logs: string) {
  // Initialize inside the function to ensure process.env.API_KEY is accessed at runtime
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a senior full-stack engineer fixing a Clerk-to-Neon synchronization issue for JobFlow AI.
    
    ENVIRONMENT: 
    - Domain: jobflow-ai-v2.vercel.app
    - Database: Neon (PostgreSQL)
    - Auth: Clerk

    TASK:
    1. Generate a robust Next.js API route for Clerk Webhooks (api/webhooks/clerk/route.ts).
    2. Use 'svix' for header validation.
    3. The webhook should listen for 'user.created'.
    4. On 'user.created', it must INSERT a new row into the 'profiles' table in Neon.
    5. Map the fields correctly: id -> clerk_user_id, email_addresses[0].email_address -> email, etc.
    
    EXPLAIN:
    Briefly explain why the user still sees "Old Session Data" even after deleting Neon rows (Clerk JWTs in browser cookies vs Database state).

    Logs: ${logs}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          fixCode: { type: Type.STRING },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["explanation", "fixCode", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text);
}
