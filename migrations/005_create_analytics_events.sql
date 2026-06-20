-- Migration: Create analytics_events table for marketing/analytics tracking
--
-- This script creates the analytics_events table to support funnel tracking
-- without storing any payment secrets or sensitive PII.
--

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow service role (server-side operations) to insert and manage events
-- Note: Supabase service_role automatically bypasses RLS, so no policy is needed for it.
-- We explicitly drop the old permissive policy in case it was previously applied.
DROP POLICY IF EXISTS "Service role can manage analytics_events" ON analytics_events;



-- Allow users to read their own events (useful for verification/debugging)
DROP POLICY IF EXISTS "Users can view own analytics events" ON analytics_events;
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for faster queries/aggregation
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
