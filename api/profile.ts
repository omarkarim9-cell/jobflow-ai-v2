import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// Lazy initialization - only create when needed
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

async function getUserIdFromClerkToken(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const response = await fetch('https://api.clerk.com/v1/tokens/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      console.error('Clerk verification failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.sub || data.user_id || data.userId || null;
  } catch (error) {
    console.error('Token verification error:', error);
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
    // Development bypass
    let userId: string;
    if (process.env.NODE_ENV === 'development') {
      userId = 'dev_user_123';
      console.log('[PROFILE] Development mode - bypassing Clerk auth');
    } else {
      userId = await getUserIdFromClerkToken(req);
      if (!userId) {
        console.error('No userId found in token');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const sql = getSql();

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const profile = result[0];
      return res.status(200).json({
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone || '',
        resumeContent: profile.resume_content,
        resumeFileName: profile.resume_file_name || '',
        preferences: profile.preferences || { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' },
        connectedAccounts: profile.connected_accounts || [],
        plan: profile.plan || 'free',
        subscriptionExpiry: profile.subscription_expiry,
        onboardedAt: profile.created_at || profile.updated_at
      });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const existing = await sql`SELECT id FROM profiles WHERE id = ${userId}`;

      if (existing.length === 0) {
        const result = await sql`
          INSERT INTO profiles (
            id, 
            email, 
            full_name, 
            phone, 
            resume_content, 
            resume_file_name, 
            preferences, 
            connected_accounts, 
            plan, 
            updated_at
          )
          VALUES (
            ${userId}, 
            ${body.email}, 
            ${body.fullName || body.full_name || ''}, 
            ${body.phone || ''}, 
            ${body.resumeContent || body.resume_content || ''}, 
            ${body.resumeFileName || body.resume_file_name || ''}, 
            ${JSON.stringify(body.preferences || {})}, 
            ${JSON.stringify(body.connectedAccounts || body.connected_accounts || [])}, 
            ${body.plan || 'free'}, 
            NOW()
          )
          RETURNING *
        `;
        
        const saved = result[0];
        return res.status(200).json({
          id: saved.id,
          fullName: saved.full_name,
          email: saved.email,
          phone: saved.phone || '',
          resumeContent: saved.resume_content,
          resumeFileName: saved.resume_file_name || '',
          preferences: saved.preferences,
          connectedAccounts: saved.connected_accounts || [],
          plan: saved.plan || 'free',
          onboardedAt: saved.updated_at
        });
      } else {
        const result = await sql`
          UPDATE profiles SET
            email = ${body.email},
            full_name = ${body.fullName || body.full_name || ''},
            phone = ${body.phone || ''},
            resume_content = ${body.resumeContent || body.resume_content || ''},
            resume_file_name = ${body.resumeFileName || body.resume_file_name || ''},
            preferences = ${JSON.stringify(body.preferences || {})},
            connected_accounts = ${JSON.stringify(body.connectedAccounts || body.connected_accounts || [])},
            plan = ${body.plan || 'free'},
            updated_at = NOW()
          WHERE id = ${userId}
          RETURNING *
        `;

        const saved = result[0];
        return res.status(200).json({
          id: saved.id,
          fullName: saved.full_name,
          email: saved.email,
          phone: saved.phone || '',
          resumeContent: saved.resume_content,
          resumeFileName: saved.resume_file_name || '',
          preferences: saved.preferences,
          connectedAccounts: saved.connected_accounts || [],
          plan: saved.plan || 'free',
          onboardedAt: saved.updated_at
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
