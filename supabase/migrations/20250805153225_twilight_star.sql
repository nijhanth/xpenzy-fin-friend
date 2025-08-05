/*
  # Add icon column to budget_categories table

  1. Changes
    - Add `icon` column to `budget_categories` table to store the selected icon
    - Set default value to '💰' for existing records
    - Update existing records to have the default icon

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

-- Add icon column to budget_categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_categories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE public.budget_categories ADD COLUMN icon TEXT DEFAULT '💰';
  END IF;
END $$;

-- Update existing records to have the default icon if they don't have one
UPDATE public.budget_categories 
SET icon = '💰' 
WHERE icon IS NULL OR icon = '';