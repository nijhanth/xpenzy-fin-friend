-- Add icon column to budget_categories table
ALTER TABLE public.budget_categories 
ADD COLUMN icon TEXT DEFAULT '💰';