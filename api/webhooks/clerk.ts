import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

// Initialize Neon connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request) {
  // 1. Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // 2. Validate headers exist
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error: Missing svix headers', { status: 400 });
  }

  // 3. Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // 4. Verify the signature
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET as string);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error: Verification failed', { status: 400 });
  }

  // 5. Handle the event
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Map data to schema
    const clerkUserId = id;
    const email = email_addresses && email_addresses[0] ? email_addresses[0].email_address : null;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();
    
    // Default preferences if not provided
    const preferences = JSON.stringify({ language: 'en' });

    try {
      // Use 'clerk_user_id' as the stable identifier for Neon lookup/upsert.
      // We assume 'id' in Neon is auto-generated (UUID) or handled by the DB if not passed,
      // or we can generate one here. For safety, we use ON CONFLICT on the unique clerk_user_id.
      const query = `
        INSERT INTO profiles (id, email, full_name, clerk_user_id, daily_ai_credits, preferences, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 5, $4, NOW())
        ON CONFLICT (clerk_user_id) 
        DO UPDATE SET 
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          updated_at = NOW();
      `;

      const client = await pool.connect();
      try {
        await client.query(query, [email, fullName, clerkUserId, preferences]);
      } finally {
        client.release();
      }

      console.log(`Successfully synced user ${clerkUserId} to Neon.`);
    } catch (error) {
      console.error('Database error processing user sync:', error);
      return new NextResponse('Error: Database operation failed', { status: 500 });
    }
  }

  return new NextResponse('Webhook received', { status: 200 });
}
