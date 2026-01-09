
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeSyncIssue(logs: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a senior full-stack engineer fixing a Clerk-to-Neon synchronization issue for JobFlow AI.
    
    ENVIRONMENT: 
    - Domain: jobflow-ai-lime.vercel.app
    - Webhook Endpoint: https://jobflow-ai-lime.vercel.app/api/webhooks/clerk
    - Database: Neon (PostgreSQL)
    - Auth: Clerk

    NEON SCHEMA ('profiles' table):
    - id (TEXT, PRIMARY KEY), email (TEXT, UNIQUE), full_name (TEXT)
    - clerk_user_id (TEXT, UNIQUE), daily_ai_credits (INTEGER, default 5)
    - preferences (JSONB, default '{"language":"en"}'), updated_at (TIMESTAMP)

    CRITICAL REQUIREMENT:
    Generate the FULL contents of 'api/webhooks/clerk.ts'. 
    - DO NOT provide a snippet. 
    - Use 'svix' for header verification.
    - Map Clerk's 'first_name' and 'last_name' to 'full_name'.
    - Use 'clerk_user_id' for the Neon lookup/insert.
    - Return 200 on success, 400 on signature fail.

    ALSO:
    - Explain that 'Ghost Sessions' exist because Clerk sessions live in browser cookies/JWTs and are independent of your Neon database state.
    - List these Vercel Env Vars specifically: DATABASE_URL, CLERK_WEBHOOK_SECRET, CLERK_SECRET_KEY.

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
