import { Webhook } from "svix";
import { buffer } from "micro";
import { NextApiRequest, NextApiResponse } from "next";
import { sql } from "@neondatabase/serverless";

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!CLERK_WEBHOOK_SECRET) return res.status(500).json({ error: "Missing CLERK_WEBHOOK_SECRET" });

  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) return res.status(400).json({ error: "Missing svix headers" });

  const payload = (await buffer(req)).toString();
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let evt: any;
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const { id, email_addresses, first_name, last_name } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created") {
    const email = email_addresses[0]?.email_address;
    const fullName = `${first_name || ""} ${last_name || ""}`.trim();

    try {
      await sql`
        INSERT INTO profiles (
          id, email, full_name, clerk_user_id, preferences, plan, daily_ai_credits
        ) VALUES (
          ${id}, ${email}, ${fullName}, ${id}, '{"language":"en", "notifications":true}'::jsonb, 'free', 5
        ) ON CONFLICT (clerk_user_id) DO NOTHING;
      `;
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error("Neon DB Error:", error);
      return res.status(500).json({ error: "Database insertion failed" });
    }
  }

  return res.status(200).json({ received: true });
}
