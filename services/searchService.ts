import { GoogleGenAI } from "@google/genai";

export const findJobLink = async (title: string, company: string): Promise<string | null> => {
  // @ts-ignore
  if (!process.env.API_KEY) {
      console.error("No API Key found");
      return null;
  }

  try {
    // Initialize Gemini client with the API key from environment
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-3-flash-preview for basic text tasks with search grounding
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find the official job application page for the position of "${title}" at "${company}". 
      Prioritize direct company career pages over job boards. 
      If using a job board like Indeed or LinkedIn, ensure the link is to the specific job post.`,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    // Extract the first web URI from the grounding metadata
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
        for (const chunk of chunks) {
            const uri = chunk.web?.uri;
            if (!uri) continue;

            // VALIDATION LOGIC
            
            // 1. Filter out broken Indeed links (must have 16-char hex ID)
            if (uri.includes('indeed.com')) {
                const idMatch = uri.match(/[?&]jk[=&]([a-f0-9]{16})/i);
                if (!idMatch) {
                    console.log("Skipping broken Indeed link found by AI:", uri);
                    continue;
                }
            }

            // 2. Filter out generic search pages or lists
            if (uri.includes('search?') || uri.includes('jobs?q=') || uri.length < 20) {
                continue;
            }

            return uri;
        }
    }
    
    return null;

  } catch (error) {
    console.error("AI Link Discovery Failed:", error);
    return null;
  }
};