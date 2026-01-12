import { Webhook } from 'svix';
import { neon } from '@neondatabase/serverless';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any) {
  console.log('🔔 Webhook received:', req.method);

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error('❌ Missing CLERK_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const payload = (await buffer(req)).toString();
  const headers = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature'],
  };

  console.log('📋 Headers received:', headers);

  let event;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(payload, headers) as any;
    console.log('✅ Webhook verified, event type:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle user.created event
  if (event.type === 'user.created') {
    console.log('👤 User created event received');
    const { id, email_addresses, first_name, last_name } = event.data;

    const email = email_addresses?.[0]?.email_address || '';
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();

    console.log('📝 User data:', { id, email, fullName });

    try {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) {
        console.error('❌ Missing DATABASE_URL');
        return res.status(500).json({ error: 'Database not configured' });
      }

      const sql = neon(DATABASE_URL);

      console.log('💾 Inserting user into Neon...');

      // Insert user into Neon
      const result = await sql`
      id,
      clerk_user_id,
      full_name,
      email,
      plan,
      daily_ai_credits,
      total_ai_used,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      ${id},
      ${fullName},
      ${email},
      'free',
      5,
      0,
      NOW()
    )
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = NOW()
    RETURNING id;

      console.log('✅ User inserted:', result);
      return res.status(200).json({ success: true, userId: id });
    } catch (error: any) {
      console.error('❌ Database error:', error.message, error.stack);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
  }

  console.log('ℹ️ Event type not handled:', event.type);
  return res.status(200).json({ received: true });
}
