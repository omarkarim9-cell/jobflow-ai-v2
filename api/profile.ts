import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Decode and verify Clerk JWT token manually
async function verifyClerkToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Decode JWT without verification (for development)
    // In production, you should verify the signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[API/PROFILE] Invalid JWT format');
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Extract user ID from Clerk JWT payload
    const userId = payload.sub || payload.user_id || payload.userId;
    
    if (!userId) {
      console.error('[API/PROFILE] No userId in JWT payload:', payload);
      return null;
    }
    
    console.log('[API/PROFILE] Extracted userId:', userId);
    return userId;
  } catch (error: any) {
    console.error('[API/PROFILE] Token decode error:', error.message);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for Vite dev server
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const userId = await verifyClerkToken(req.headers.authorization as string);
    
    if (!userId) {
      console.error('[API/PROFILE] Authentication failed');
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    console.log('[API/PROFILE] Request from user:', userId, 'Method:', req.method);

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      
      if (result.length === 0) {
        console.log('[API/PROFILE] Profile not found for:', userId);
        return res.status(404).json({ error: 'Profile not found' });
      }

      const p = result[0];
      console.log('[API/PROFILE] Profile fetched successfully');
      
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
      if (!body) {
        return res.status(400).json({ error: 'Empty request body' });
      }

      console.log('[API/PROFILE] Saving profile for:', userId);

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
      
      const saved = result[0];
      console.log('[API/PROFILE] Profile saved successfully');
      
      return res.status(200).json({
        id: saved.id,
        fullName: saved.full_name,
        email: saved.email,
        phone: saved.phone || '',
        resumeContent: saved.resume_content,
        resumeFileName: saved.resume_file_name || '',
        preferences: typeof saved.preferences === 'string' ? JSON.parse(saved.preferences) : saved.preferences,
        connectedAccounts: saved.connected_accounts || [],
        plan: saved.plan || 'free',
        onboardedAt: saved.updated_at
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('[API/PROFILE] Error:', error.message, error.stack);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}