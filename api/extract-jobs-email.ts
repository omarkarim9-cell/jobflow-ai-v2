import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const userId = req.headers['x-clerk-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { html } = req.body as any;
    if (!html) {
      return res.status(400).json({ error: 'Missing HTML' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `Extract ALL job listings from this email HTML content:

${html.substring(0, 15000)}

For each job found, extract:
1. title (job title/position)
2. company (company name)  
3. location (city/state/country or "remote")
4. applicationUrl (direct apply link if available)

**OUTPUT JSON FORMAT ONLY:**
{
  "jobs": [
    {
      "title": "exact job title",
      "company": "company name", 
      "location": "location or 'remote'",
      "applicationUrl": "direct link or null"
    }
  ]
}

Return VALID JSON only - no explanations.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(responseText);

    // Save jobs to database
    if (data.jobs && Array.isArray(data.jobs)) {
      for (const job of data.jobs) {
        await sql`
          INSERT INTO jobs (clerk_user_id, job_title, company, location, job_url, extracted_at)
          VALUES (${userId}, ${job.title}, ${job.company}, ${job.location}, ${job.applicationUrl || ''}, NOW())
          ON CONFLICT (job_url) DO NOTHING
        `;
      }
    }

    return res.status(200).json({
      success: true,
      jobs: data.jobs || [],
      count: data.jobs?.length || 0
    });

  } catch (error: any) {
    console.error('[API/EXTRACT-JOBS-EMAIL] Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
