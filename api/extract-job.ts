import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import { GoogleGenerativeAI } from '@google/generative-ai';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, pageContent } = req.body as any;
    const userId = req.headers['x-clerk-user-id'] as string;

    if (!userId || !url) {
      return res.status(400).json({ error: 'Missing userId or url' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    console.log('[extract-job] Creating GoogleGenerativeAI with key:', apiKey.substring(0, 20) + '...');

    const ai = new GoogleGenerativeAI(apiKey);

    // Enhanced prompt for better extraction
    const prompt = pageContent
      ? `Extract job details from this HTML content.

HTML: ${pageContent.substring(0, 4000)}

Extract ONLY:
- jobTitle (string)
- company (string) 
- location (string)
- salary (string or null)
- jobUrl (string)
- description (string)

Return valid JSON only.`
      : 'No page content provided';

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const extracted = JSON.parse(result.response.text().replace(/```json\n?|```/g, '').trim());

    // Save to database
    await sql`
      INSERT INTO jobs (clerk_user_id, job_title, company, location, salary, job_url, description, extracted_at)
      VALUES (${userId}, ${extracted.jobTitle}, ${extracted.company}, ${extracted.location}, ${extracted.salary}, ${url}, ${extracted.description}, NOW())
      ON CONFLICT (job_url) DO NOTHING
    `;

    return res.status(200).json({
      success: true,
      job: extracted
    });

  } catch (error: any) {
    console.error('[extract-job]', error);
    return res.status(500).json({ error: 'Extraction failed', details: error.message });
  }
}
