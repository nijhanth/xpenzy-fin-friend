-- Enable Row Level Security on budget_categories table
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow users to manage their own budget categories
CREATE POLICY "Users can view their own budget categories" 
ON public.budget_categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget categories" 
ON public.budget_categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget categories" 
ON public.budget_categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget categories" 
ON public.budget_categories 
FOR DELETE 
USING (auth.uid() = user_id);