ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.savings_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_entries_goal_id
  ON public.expense_entries(goal_id);

ALTER TABLE public.budget_categories
  ADD COLUMN IF NOT EXISTS current numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '💰',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS month integer,
  ADD COLUMN IF NOT EXISTS week integer,
  ADD COLUMN IF NOT EXISTS linked_type text DEFAULT 'expenses',
  ADD COLUMN IF NOT EXISTS linked_id uuid;

CREATE INDEX IF NOT EXISTS idx_budget_categories_linked
  ON public.budget_categories(linked_type, linked_id);
