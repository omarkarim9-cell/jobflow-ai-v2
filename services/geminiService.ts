/**
 * Service to analyze Clerk-to-Neon sync issues.
 * Uses dynamic imports to prevent top-level crashes in the browser.
 */
export async function analyzeSyncIssue(logs: string) {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "") {
    throw new Error("API_KEY is missing. Please ensure it is set in your environment variables.");
  }

  // Dynamically import the library only when this function is called.
  // This prevents the "API Key must be set when running in a browser" crash at load-time.
  const { GoogleGenAI, Type } = await import("@google/genai");

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a senior full-stack engineer fixing a Clerk-to-Neon synchronization issue for JobFlow AI.
    
    ISSUE:
    The user deleted all rows in Neon, but they are still logged in via Clerk. They see "Ghost Data" because the Clerk session exists in browser cookies while the Neon database is empty.
    
    TASK:
    1. Explain the disconnect between Clerk's Auth state (Browser Cookies) and Neon's DB state.
    2. Provide a full Next.js Route Handler for 'api/webhooks/clerk/route.ts'.
    3. The code must use 'svix' to verify the webhook signature.
    4. On 'user.created', it should UPSERT the user into the Neon 'profiles' table.
    5. Map fields: user.id -> clerk_user_id, user.email_addresses[0].email_address -> email.

    Contextual Logs: ${logs}`,
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
