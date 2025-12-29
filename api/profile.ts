import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

let sql: any = null;
const getSql = () => {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
};

async function verifyClerkToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[PROFILE] No auth header or invalid format');
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Decode JWT manually (faster than API call)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[PROFILE] Invalid JWT format');
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const userId = payload.sub || payload.user_id || payload.userId;
    
    if (!userId) {
      console.error('[PROFILE] No userId in JWT payload');
      return null;
    }
    
    console.log('[PROFILE] Extracted userId:', userId);
    return userId;
  } catch (error: any) {
    console.error('[PROFILE] Token decode error:', error.message);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      console.error('[PROFILE] Authentication failed');
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    console.log('[PROFILE] Request from user:', userId, 'Method:', req.method);

    const sql = getSql();

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      
      if (result.length === 0) {
        console.log('[PROFILE] Profile not found for:', userId);
        return res.status(404).json({ error: 'Profile not found' });
      }

      const p = result[0];
      console.log('[PROFILE] Profile fetched successfully');
      
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
        subscriptionExpiry: p.subscription_expiry,
        onboardedAt: p.created_at || p.updated_at
      });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body) {
        return res.status(400).json({ error: 'Empty request body' });
      }

      console.log('[PROFILE] Saving profile for:', userId);

      const prefs = typeof body.preferences === 'string' ? body.preferences : JSON.stringify(body.preferences || {});
      const accounts = typeof body.connectedAccounts === 'string' ? body.connectedAccounts : JSON.stringify(body.connectedAccounts || []);

      const existing = await sql`SELECT id FROM profiles WHERE id = ${userId}`;

      if (existing.length === 0) {
        const result = await sql`
          INSERT INTO profiles (id, email, full_name, phone, resume_content, resume_file_name, preferences, connected_accounts, plan, updated_at)
          VALUES (
            ${userId}, 
            ${body.email || ''}, 
            ${body.fullName || body.full_name || ''}, 
            ${body.phone || ''}, 
            ${body.resumeContent || body.resume_content || ''}, 
            ${body.resumeFileName || body.resume_file_name || ''}, 
            ${prefs}, 
            ${accounts}, 
            ${body.plan || 'free'}, 
            NOW()
          )
          RETURNING *
        `;
        
        const saved = result[0];
        console.log('[PROFILE] Profile created successfully');
        
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
      } else {
        const result = await sql`
          UPDATE profiles SET
            email = ${body.email || ''},
            full_name = ${body.fullName || body.full_name || ''},
            phone = ${body.phone || ''},
            resume_content = ${body.resumeContent || body.resume_content || ''},
            resume_file_name = ${body.resumeFileName || body.resume_file_name || ''},
            preferences = ${prefs},
            connected_accounts = ${accounts},
            plan = ${body.plan || 'free'},
            updated_at = NOW()
          WHERE id = ${userId}
          RETURNING *
        `;

        const saved = result[0];
        console.log('[PROFILE] Profile updated successfully');
        
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
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('[PROFILE] Error:', error.message, error.stack);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}