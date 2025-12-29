import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Debug logs
  console.log('[extract-job] process.env keys:', Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY')));
  console.log('[extract-job] API_KEY exists:', !!process.env.API_KEY);
  console.log('[extract-job] API_KEY value:', process.env.API_KEY);

  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'Missing url' });
    }

    console.log('[extract-job] Processing URL:', url);

    // 1) Fetch page HTML via proxy (server-side)
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    let pageContent = '';

    try {
      const pageRes = await fetch(proxyUrl);
      if (pageRes.ok) {
        pageContent = await pageRes.text();
        console.log('[extract-job] Fetched page content, length:', pageContent.length);
      }
    } catch (e) {
      console.error('[extract-job] Failed to fetch page content:', e);
    }

    // 2) Call Gemini on the server
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY environment variable is not set');
    }

    console.log('[extract-job] Creating GoogleGenAI with key:', apiKey.substring(0, 20) + '...');
    const ai = new GoogleGenAI({ apiKey });

    const prompt = pageContent
      ? `Extract job details from this HTML content. Return ONLY valid JSON with these exact keys: title, company, location, salaryRange, description, requirements (as array).

HTML Content (from any job site: LinkedIn, Indeed, Seek, Naukrigulf, GulfTalent, company pages, etc.):

${pageContent.substring(0, 15000)}

Return format:
{
  "title": "Job Title",
  "company": "Company Name",
  "location": "Location",
  "salaryRange": "Salary or empty string",
  "description": "Job description",
  "requirements": ["req1", "req2"]
}`
      : `Extract job details from this URL: ${url}. If you cannot access it, return a template with:
{
  "title": "Manual Entry Required",
  "company": "Unknown",
  "location": "Remote",
  "salaryRange": "",
  "description": "Please manually enter job details",
  "requirements": []
}`;

    console.log('[extract-job] Calling generateContent with Gemini...');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    console.log('[extract-job] Gemini response received, length:', text.length);

    // Parse JSON (even if extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    const data = JSON.parse(jsonText);

    const normalized = {
      title: data.title || 'Job Title',
      company: data.company || 'Company',
      location: data.location || 'Remote',
      salaryRange: data.salaryRange || data.salary || '',
      description: data.description || 'No description available',
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
    };

    console.log('[extract-job] Extraction successful:', normalized.title);
    return res.status(200).json({ data: normalized, sources: [] });
  } catch (error: any) {
    console.error('[extract-job] Error:', error);
    return res.status(500).json({
      data: {
        title: 'Extraction Failed',
        company: 'Unknown',
        location: 'Remote',
        salaryRange: '',
        description: `Error: ${error.message}. Please add details manually.`,
        requirements: [],
      },
      sources: [],
    });
  }
}
