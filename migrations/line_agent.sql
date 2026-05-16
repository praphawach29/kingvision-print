-- LINE Agent: session storage + leads table

CREATE TABLE IF NOT EXISTS line_sessions (
  user_id      text PRIMARY KEY,
  display_name text,
  messages     jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS line_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text,
  display_name text,
  phone        text,
  interest     text,
  message      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE line_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_leads    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='line_sessions' AND policyname='admin_line_sessions') THEN
    CREATE POLICY admin_line_sessions ON line_sessions USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='line_leads' AND policyname='admin_line_leads') THEN
    CREATE POLICY admin_line_leads ON line_leads USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
    );
  END IF;
END $$;
