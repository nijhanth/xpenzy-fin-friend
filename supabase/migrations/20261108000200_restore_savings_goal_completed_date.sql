ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS completed_date timestamptz;

NOTIFY pgrst, 'reload schema';
