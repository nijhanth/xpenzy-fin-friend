/*
  # Create financial data tables

  1. New Tables
    - `income_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `amount` (decimal)
      - `date` (date)
      - `category` (text)
      - `payment_mode` (text)
      - `notes` (text)
      - `custom_category` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `expense_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `amount` (decimal)
      - `date` (date)
      - `category` (text)
      - `subcategory` (text)
      - `payment_mode` (text)
      - `notes` (text)
      - `custom_category` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `savings_goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `target` (decimal)
      - `current` (decimal)
      - `date` (date)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `investment_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `type` (text)
      - `name` (text)
      - `invested` (decimal)
      - `current` (decimal)
      - `date` (date)
      - `notes` (text)
      - `custom_type` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create income_entries table
CREATE TABLE IF NOT EXISTS income_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  date date NOT NULL,
  category text NOT NULL,
  payment_mode text NOT NULL,
  notes text DEFAULT '',
  custom_category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own income entries"
  ON income_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create expense_entries table
CREATE TABLE IF NOT EXISTS expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL,
  date date NOT NULL,
  category text NOT NULL,
  subcategory text NOT NULL,
  payment_mode text NOT NULL,
  notes text DEFAULT '',
  custom_category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own expense entries"
  ON expense_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create savings_goals table
CREATE TABLE IF NOT EXISTS savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target decimal(12,2) NOT NULL,
  current decimal(12,2) DEFAULT 0,
  date date NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own savings goals"
  ON savings_goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create investment_entries table
CREATE TABLE IF NOT EXISTS investment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text NOT NULL,
  invested decimal(12,2) NOT NULL,
  current decimal(12,2) DEFAULT 0,
  date date NOT NULL,
  notes text DEFAULT '',
  custom_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE investment_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own investment entries"
  ON investment_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_income_entries_updated_at
BEFORE UPDATE ON income_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_entries_updated_at
BEFORE UPDATE ON expense_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
BEFORE UPDATE ON savings_goals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_entries_updated_at
BEFORE UPDATE ON investment_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();