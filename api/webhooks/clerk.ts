import { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'svix';
import { neon } from '@neondatabase/serverless';
import { buffer } from 'stream/consumers';

// 1. Disable Next.js body parsing to verify the raw signature
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  // 2. verify the SVIX signature
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ message: 'Missing svix headers' });
  }

  let payload: any;

  try {
    // Read the raw body
    const rawBody = (await buffer(req)).toString();
    const wh = new Webhook(WEBHOOK_SECRET);
    payload = wh.verify(rawBody, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).json({ message: 'Webhook verification failed' });
  }

  // 3. Connect to Neon
  const sql = neon(process.env.DATABASE_URL!);
  const { type, data } = payload as { type: string; data: any };

  try {
    // 4. Handle specific Clerk events
    if (type === 'user.created') {
      const email = data.email_addresses?.[0]?.email_address || '';
      const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      const clerkId = data.id;

      // Insert into 'profiles'. We use the Clerk ID as the Primary Key 'id' for simplicity
      // Defaults (plan, credits) are handled by DB or explicit values here.
      await sql`
        INSERT INTO profiles (
          id, 
          clerk_user_id, 
          email, 
          full_name, 
          plan, 
          daily_ai_credits, 
          total_ai_used,
          preferences,
          connected_accounts,
          updated_at
        )
        VALUES (
          ${clerkId}, 
          ${clerkId}, 
          ${email}, 
          ${fullName}, 
          'free', 
          5, 
          0,
          '{"language":"en", "notifications": true}'::jsonb,
          '{}'::jsonb,
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `;
      console.log(`User created: ${clerkId}`);
    }

    if (type === 'user.updated') {
      const email = data.email_addresses?.[0]?.email_address || '';
      const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      const clerkId = data.id;

      await sql`
        UPDATE profiles 
        SET 
          email = ${email}, 
          full_name = ${fullName}, 
          updated_at = NOW()
        WHERE clerk_user_id = ${clerkId};
      `;
      console.log(`User updated: ${clerkId}`);
    }

    // Return 200 to Clerk to acknowledge receipt
    return res.status(200).json({ success: true });

  } catch (dbError) {
    console.error('Database error in webhook:', dbError);
    // Return 500 so Clerk retries the webhook later
    return res.status(500).json({ message: 'Database sync error' });
  }
}
