ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS ai_memory_enabled boolean NOT NULL DEFAULT true;
