-- Migration: Fix overly permissive RLS policies
-- Run this in Supabase Dashboard → SQL Editor → New query

-- ─── customer_insights ────────────────────────────────────────────────────────
-- Drop the "allow all" policy
DROP POLICY IF EXISTS "service_all_insights" ON customer_insights;

-- Users can only read/write their own insights
CREATE POLICY "users_own_insights_select" ON customer_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_own_insights_insert" ON customer_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_insights_update" ON customer_insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_own_insights_delete" ON customer_insights
  FOR DELETE USING (auth.uid() = user_id);

-- ─── ai_knowledge_base ────────────────────────────────────────────────────────
-- Drop the "allow all" policy (already has public_read_kb for SELECT)
DROP POLICY IF EXISTS "service_all_kb" ON ai_knowledge_base;

-- Only admins can insert/update/delete knowledge base entries
CREATE POLICY "admins_manage_kb_insert" ON ai_knowledge_base
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "admins_manage_kb_update" ON ai_knowledge_base
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "admins_manage_kb_delete" ON ai_knowledge_base
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ─── profiles: prevent users from elevating their own role ────────────────────
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    -- Allow updating any field EXCEPT role
    -- Role can only be changed by admins via service role key
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
