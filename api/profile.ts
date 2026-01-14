 
import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import type { UserProfile } from '../types';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = req.headers['x-clerk-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Missing user ID' });
    }

    // GET profile
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM profiles WHERE clerk_user_id = ${userId} LIMIT 1`;

      if (!rows.length) {
        return res.status(200).json(null);
      }

      const row = rows[0];
      const profile: UserProfile = {
        id: row.clerk_user_id,
        fullName: row.full_name || '',
        email: row.email || '',
        phone: row.phone || '',                    // ✅ Added
        resumeContent: row.resume_content || '',   // ✅ Added  
        resumeFileName: row.resume_file_name || '', // ✅ Added
        preferences: row.preferences || {},
        connectedAccounts: row.connected_accounts || [],
        plan: row.plan || 'free',
        dailyAiCredits: row.daily_ai_credits || 0,
        totalAiUsed: row.total_ai_used || 0,
      };

      return res.status(200).json(profile);
    }

    // POST - create/update profile (Clerk webhook)
    if (req.method === 'POST') {
      const body = req.body as any;
      const email = body.data?.email_addresses?.[0]?.email_address || body.email || '';
      const fullName = body.data?.full_name || body.fullName || '';

      const rows = await sql`
        INSERT INTO profiles (clerk_user_id, full_name, email, updated_at)
        VALUES (${userId}, ${fullName}, ${email}, NOW())
        ON CONFLICT (clerk_user_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          updated_at = NOW()
        RETURNING *
      `;

      return res.status(200).json(rows[0]);
    }

    // DELETE profile
    if (req.method === 'DELETE') {
      await sql`DELETE FROM profiles WHERE clerk_user_id = ${userId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('[PROFILE API]', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
=======
import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import type { UserProfile } from '../types';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = req.headers['x-clerk-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Missing user ID' });
    }

    // GET profile
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM profiles WHERE clerk_user_id = ${userId} LIMIT 1`;

      if (!rows.length) {
        return res.status(200).json(null);
      }

      const row = rows[0];
      const profile: UserProfile = {
        id: row.clerk_user_id,
        fullName: row.full_name || '',
        email: row.email || '',
        phone: row.phone || '',                    // ✅ Added
        resumeContent: row.resume_content || '',   // ✅ Added  
        resumeFileName: row.resume_file_name || '', // ✅ Added
        preferences: row.preferences || {},
        connectedAccounts: row.connected_accounts || [],
        plan: row.plan || 'free',
        dailyAiCredits: row.daily_ai_credits || 0,
        totalAiUsed: row.total_ai_used || 0,
      };

      return res.status(200).json(profile);
    }

    // POST - create/update profile (Clerk webhook)
    if (req.method === 'POST') {
      const body = req.body as any;
      const email = body.data?.email_addresses?.[0]?.email_address || body.email || '';
      const fullName = body.data?.full_name || body.fullName || '';

      const rows = await sql`
        INSERT INTO profiles (clerk_user_id, full_name, email, updated_at)
        VALUES (${userId}, ${fullName}, ${email}, NOW())
        ON CONFLICT (clerk_user_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          updated_at = NOW()
        RETURNING *
      `;

      return res.status(200).json(rows[0]);
    }

    // DELETE profile
    if (req.method === 'DELETE') {
      await sql`DELETE FROM profiles WHERE clerk_user_id = ${userId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('[PROFILE API]', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
  45a145927e075b37a66e9b4d7b268d3499230129
