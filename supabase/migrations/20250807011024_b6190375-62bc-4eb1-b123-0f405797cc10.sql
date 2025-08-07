-- Add date-specific fields to budget_categories table
ALTER TABLE public.budget_categories 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN year INTEGER,
ADD COLUMN month INTEGER,
ADD COLUMN week INTEGER;