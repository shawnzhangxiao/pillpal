import { sql } from "@vercel/postgres";

export { sql };

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      push_subscription JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS medication_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      coq10_taken BOOLEAN DEFAULT false,
      folic_acid_taken BOOLEAN DEFAULT false,
      coq10_time TIMESTAMPTZ,
      folic_acid_time TIMESTAMPTZ,
      UNIQUE(user_id, date)
    )
  `;
}
