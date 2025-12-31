import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Debug logs
  console.log('[extract-job] Environment keys:', Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY')));
  console.log('[extract-job] GOOGLE_GENERATIVE_AI_API_KEY exists:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

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
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing url in request body' });
    }

    console.log('[extract-job] Processing URL:', url);

    // 1. Fetch page HTML via proxy (server-side)
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    let pageContent = '';

    try {
      const pageRes = await fetch(proxyUrl, { timeout: 15000 });
      if (pageRes.ok) {
        pageContent = await pageRes.text();
        console.log('[extract-job] Fetched page content, length:', pageContent.length);
      }
    } catch (e) {
      console.error('[extract-job] Failed to fetch page content:', e);
      pageContent = '';
    }

    // 2. Call Gemini on the server
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[extract-job] API key not found in environment');
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set');
    }

    console.log('[extract-job] Creating GoogleGenerativeAI with key:', apiKey.substring(0, 20) + '...');

    const ai = new GoogleGenerativeAI(apiKey);
    
    // Enhanced prompt for better extraction
    const prompt = pageContent
      ? `Extract job details from this HTML content.
