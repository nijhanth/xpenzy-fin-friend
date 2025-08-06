/*
  # Create savings transactions table

  1. New Tables
    - `savings_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `savings_goal_id` (uuid, foreign key to savings_goals)
      - `amount` (decimal)
      - `date` (date)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `savings_transactions` table
    - Add policies for authenticated users to manage their own transactions

  3. Functions
    - Create trigger to automatically update savings goal current amount when transactions change
*/

-- Create savings_transactions table
CREATE TABLE IF NOT EXISTS public.savings_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  savings_goal_id uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own savings transactions"
  ON public.savings_transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_savings_transactions_updated_at
BEFORE UPDATE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update savings goal current amount when transactions change
CREATE OR REPLACE FUNCTION public.update_savings_goal_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the current amount in savings_goals by summing all transactions
  UPDATE public.savings_goals 
  SET current = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.savings_transactions 
    WHERE savings_goal_id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id)
  )
  WHERE id = COALESCE(NEW.savings_goal_id, OLD.savings_goal_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update savings goal totals
CREATE TRIGGER update_savings_goal_total_on_insert
AFTER INSERT ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_savings_goal_total();

CREATE TRIGGER update_savings_goal_total_on_update
AFTER UPDATE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_savings_goal_total();

CREATE TRIGGER update_savings_goal_total_on_delete
AFTER DELETE ON public.savings_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_savings_goal_total();