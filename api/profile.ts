
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as ClerkServer from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: 'DATABASE_URL is missing.' });
    }

    let userId: string | null = null;
    
    // Attempt 1: Check manual header first (reliable for Lab/Tester)
    userId = req.headers['x-clerk-user-id'] as string || null;

    // Attempt 2: Clerk SDK (standard app flow)
    if (!userId) {
      try {
        const Clerk = (ClerkServer as any).default || ClerkServer;
        // Check if we are in a Vercel Node context where getAuth might need the request
        const auth = Clerk.getAuth(req);
        userId = auth?.userId;
      } catch (authError) {
        console.warn('[API/PROFILE] Clerk SDK session detection skipped or failed.');
      }
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'No User ID found in session or x-clerk-user-id header.' 
      });
    }

    const sql = neon(dbUrl);

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      if (result.length === 0) return res.status(404).json({ error: 'Profile not found.' });
      
      const p = result[0];
      return res.status(200).json({
        id: p.id,
        fullName: p.full_name,
        email: p.email,
        phone: p.phone || '',
        resumeContent: p.resume_content,
        resumeFileName: p.resume_file_name || '',
        preferences: typeof p.preferences === 'string' ? JSON.parse(p.preferences) : p.preferences,
        connectedAccounts: p.connected_accounts || [],
        plan: p.plan || 'free',
        onboardedAt: p.created_at || p.updated_at
      });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body) return res.status(400).json({ error: 'Empty request body.' });

      const prefs = typeof body.preferences === 'string' ? body.preferences : JSON.stringify(body.preferences || {});
      const accounts = typeof body.connectedAccounts === 'string' ? body.connectedAccounts : JSON.stringify(body.connectedAccounts || []);

      const result = await sql`
        INSERT INTO profiles (id, email, full_name, phone, resume_content, resume_file_name, preferences, connected_accounts, plan, updated_at)
        VALUES (
          ${userId}, 
          ${body.email || ''}, 
          ${body.fullName || ''}, 
          ${body.phone || ''}, 
          ${body.resumeContent || ''}, 
          ${body.resumeFileName || ''}, 
          ${prefs}, 
          ${accounts}, 
          ${body.plan || 'free'}, 
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          resume_content = EXCLUDED.resume_content,
          resume_file_name = EXCLUDED.resume_file_name,
          preferences = EXCLUDED.preferences,
          connected_accounts = EXCLUDED.connected_accounts,
          plan = EXCLUDED.plan,
          updated_at = NOW()
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('[API/PROFILE] Fatal Crash:', error.message);
    return res.status(500).json({ error: 'API Execution Error', details: error.message });
  }
}
