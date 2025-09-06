-- Add current field to budget_categories table to track current spending/progress
ALTER TABLE public.budget_categories 
ADD COLUMN current numeric DEFAULT 0;