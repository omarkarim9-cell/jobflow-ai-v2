
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      if (result.length === 0) return res.status(404).json({ error: 'Profile not found' });

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
          INSERT INTO profiles (id, email, full_name, phone, resume_content, resume_file_name, preferences, connected_accounts, plan, updated_at)
          VALUES (${userId}, ${body.email}, ${body.fullName || ''}, ${body.phone || ''}, ${body.resumeContent || ''}, ${body.resumeFileName || ''}, ${JSON.stringify(body.preferences || {})}, ${JSON.stringify(body.connectedAccounts || [])}, ${body.plan || 'free'}, NOW())
          RETURNING *
        `;
        return res.status(200).json(result[0]);
      } else {
        const result = await sql`
          UPDATE profiles SET
            email = ${body.email},
            full_name = ${body.fullName || ''},
            phone = ${body.phone || ''},
            resume_content = ${body.resumeContent || ''},
            resume_file_name = ${body.resumeFileName || ''},
            preferences = ${JSON.stringify(body.preferences || {})},
            connected_accounts = ${JSON.stringify(body.connectedAccounts || [])},
            plan = ${body.plan || 'free'},
            updated_at = NOW()
          WHERE id = ${userId}
          RETURNING *
        `;
        return res.status(200).json(result[0]);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
