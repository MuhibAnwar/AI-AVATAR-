const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id  TEXT UNIQUE NOT NULL,
      user_id     TEXT,
      title       TEXT DEFAULT 'New Call',
      started_at  TIMESTAMPTZ DEFAULT NOW(),
      ended_at    TIMESTAMPTZ,
      message_count INT DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      call_id    UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_calls_user_id    ON calls(user_id);
    CREATE INDEX IF NOT EXISTS idx_calls_session_id ON calls(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_call_id ON messages(call_id);
  `);
  console.log('🗄  Neon DB: tables ready');
}

module.exports = { pool, initDb };
