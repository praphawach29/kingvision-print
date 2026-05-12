-- Chat history table — stores conversation per user
-- Anonymous users use localStorage only; logged-in users sync here

CREATE TABLE IF NOT EXISTS chat_history (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text        NOT NULL,
  messages   jsonb       NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only read and write their own history
CREATE POLICY "users own chat history"
  ON chat_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
