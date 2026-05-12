-- Rate limiting table for /api/ai/chat
-- Records each request with IP + timestamp, cleaned up automatically

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id          bigserial PRIMARY KEY,
  ip          text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_ip_created_at
  ON ai_rate_limits (ip, created_at);

-- No RLS needed — only accessed via service role key from server
