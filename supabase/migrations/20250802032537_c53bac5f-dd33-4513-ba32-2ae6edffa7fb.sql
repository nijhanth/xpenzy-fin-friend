-- Add profit_loss column to investment_transactions table
ALTER TABLE public.investment_transactions 
ADD COLUMN profit_loss NUMERIC DEFAULT 0;