import { Webhook } from 'svix';
import { buffer } from 'micro';
import { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

export const config = {
  api: {
    bodyParser: false,
  },
};

const sql = neon(process.env.DATABASE_URL!);
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = (await buffer(req)).toString();
  const headers = req.headers;

  const svix_id = headers['svix-id'] as string;
  const svix_timestamp = headers['svix-timestamp'] as string;
  const svix_signature = headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(webhookSecret);
  let evt: any;

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { 
        email_addresses, 
        first_name, 
        last_name, 
        image_url, 
        phone_numbers 
      } = evt.data;
      
      const email = email_addresses[0]?.email_address;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();
      const phone = phone_numbers[0]?.phone_number || '';

      await sql`
        INSERT INTO profiles (
          id, 
          email, 
          full_name, 
          clerk_user_id, 
          phone, 
          updated_at
        )
        VALUES (
          ${id}, 
          ${email}, 
          ${fullName}, 
          ${id}, 
          ${phone}, 
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          updated_at = NOW();
      `;
    }

    if (eventType === 'user.deleted') {
      await sql`DELETE FROM profiles WHERE id = ${id}`;
    }

    return res.status(200).json({ success: true });
  } catch (dbError) {
    console.error('Database Sync Error:', dbError);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
