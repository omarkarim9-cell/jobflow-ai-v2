
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeSyncIssue(logs: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The user is building JobFlow AI. 
    ENVIRONMENT: Vercel Cloud, GitHub, Neon (DB), Clerk (Auth).
    PATH: 'api/webhooks/clerk.ts' (Next.js Pages Router).
    
    NEON SCHEMA ('profiles' table):
    - id (TEXT, PRIMARY KEY), email (TEXT, UNIQUE), full_name (TEXT), resume_content (TEXT)
    - preferences (JSONB, default '{"language":"en", "notifications": true}')
    - connected_accounts (JSONB, default '{}'), plan (TEXT, default 'free')
    - daily_ai_credits (INTEGER, default 5), total_ai_used (INTEGER, default 0)
    - phone (TEXT, default ''), resume_file_name (TEXT, default '')
    - clerk_user_id (TEXT, UNIQUE), updated_at (TIMESTAMP)

    CRITICAL INSTRUCTION: 
    Generate a FULL, COMPLETE, and ROBUST TypeScript file for the webhook. 
    One line is UNACCEPTABLE. The output 'fixCode' MUST include:
    1. Imports for 'svix', 'NextApiRequest', 'NextApiResponse'.
    2. A database client initialization (assume @neondatabase/serverless or similar).
    3. Signature verification logic using Svix and CLERK_WEBHOOK_SECRET.
    4. An async handler function.
    5. 'user.created' and 'user.updated' case logic mapping Clerk fields to the EXACT column names above.
    6. Try/catch blocks and proper 200/400/500 status responses.

    ALSO:
    7. Explain 'Ghost Sessions': Why browser sessions persist even if Neon rows are deleted.
    8. List required Vercel Env Vars: CLERK_WEBHOOK_SECRET, DATABASE_URL.

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
