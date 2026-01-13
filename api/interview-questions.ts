import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[INTERVIEW] HANDLER START, NODE_ENV =', process.env.NODE_ENV, 'method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-clerk-user-id'] as string;
    const { job, profile } = req.body as any;  // ✅ Using 'any' - no types needed

    if (!userId || !job || !profile) {
      return res.status(400).json({ error: 'Missing userId, job or profile payload' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate 12-15 comprehensive interview questions for ${profile.fullName || 'candidate'} applying for:

**JOB POSITION:** ${job.jobTitle || 'this position'}
**COMPANY:** ${job.company || 'this company'} 
**LOCATION:** ${job.location || 'this location'}
**JOB DESCRIPTION:** ${job.description?.substring(0, 3000) || 'No description provided'}

**REQUIREMENTS:**
1. 5-7 TECHNICAL questions directly from job description requirements
2. 4-5 BEHAVIORAL questions (STAR method)  
3. 3-4 COMPANY-SPECIFIC questions showing research
4. Questions should test ability to handle job responsibilities
5. Mix difficulty levels (basic, intermediate, advanced)

**OUTPUT FORMAT (JSON array only):**
[
  {
    "question": "Full question text",
    "category": "technical|behavioral|company", 
    "difficulty": "basic|intermediate|advanced"
  }
]

Return VALID JSON only.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, '').trim();
    const questions = JSON.parse(responseText);

    console.log('[INTERVIEW] Questions count:', Array.isArray(questions) ? questions.length : 0);

    return res.status(200).json({
      success: true,
      questions,
      count: Array.isArray(questions) ? questions.length : 0
    });

  } catch (error: any) {
    console.error('[INTERVIEW] Error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Failed to generate interview questions' });
  }
}
