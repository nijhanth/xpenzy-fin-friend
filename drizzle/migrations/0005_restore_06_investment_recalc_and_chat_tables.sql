-- Update the investment total function to also update invested amount when transactions are added
CREATE OR REPLACE FUNCTION public.update_investment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update both invested and current amounts in investment_entries
  -- Invested = original invested + sum of all transaction amounts
  -- Current = new invested amount + sum of all profit_loss from transactions
  UPDATE public.investment_entries 
  SET 
    invested = (
      SELECT ie_original.invested + COALESCE(SUM(it.amount), 0)
      FROM public.investment_entries ie_original
      LEFT JOIN public.investment_transactions it ON it.investment_id = ie_original.id
      WHERE ie_original.id = COALESCE(NEW.investment_id, OLD.investment_id)
      GROUP BY ie_original.invested
    ),
    current = (
      SELECT ie_original.invested + COALESCE(SUM(it.amount), 0) + COALESCE(SUM(it.profit_loss), 0)
      FROM public.investment_entries ie_original
      LEFT JOIN public.investment_transactions it ON it.investment_id = ie_original.id
      WHERE ie_original.id = COALESCE(NEW.investment_id, OLD.investment_id)
      GROUP BY ie_original.invested
    )
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for investment transactions if it doesn't exist
DROP TRIGGER IF EXISTS update_investment_totals_trigger ON public.investment_transactions;
CREATE TRIGGER update_investment_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_investment_total();

-- Fix the investment total function to correctly calculate amounts
CREATE OR REPLACE FUNCTION public.update_investment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  original_invested numeric;
  total_transaction_amount numeric;
  total_profit_loss numeric;
BEGIN
  -- Get the original invested amount (this should not change)
  SELECT invested INTO original_invested 
  FROM public.investment_entries 
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Get total transaction amounts for this investment
  SELECT COALESCE(SUM(amount), 0) INTO total_transaction_amount
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Get total profit/loss for this investment
  SELECT COALESCE(SUM(profit_loss), 0) INTO total_profit_loss
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Update the investment entry
  -- invested = original invested + all transaction amounts
  -- current = invested + profit/loss
  UPDATE public.investment_entries 
  SET 
    invested = original_invested + total_transaction_amount,
    current = original_invested + total_transaction_amount + total_profit_loss
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix the investment total function to correctly calculate amounts
CREATE OR REPLACE FUNCTION public.update_investment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_transaction_amount numeric;
  total_profit_loss numeric;
BEGIN
  -- Get total transaction amounts for this investment
  SELECT COALESCE(SUM(amount), 0) INTO total_transaction_amount
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Get total profit/loss for this investment
  SELECT COALESCE(SUM(profit_loss), 0) INTO total_profit_loss
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Update the investment entry
  -- invested = sum of all transaction amounts (no original amount)
  -- current = invested + profit/loss
  UPDATE public.investment_entries 
  SET 
    invested = total_transaction_amount,
    current = total_transaction_amount + total_profit_loss
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update all existing investment entries to fix their amounts
UPDATE public.investment_entries 
SET 
  invested = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.investment_transactions 
    WHERE investment_id = investment_entries.id
  ),
  current = (
    SELECT COALESCE(SUM(amount), 0) + COALESCE(SUM(profit_loss), 0)
    FROM public.investment_transactions 
    WHERE investment_id = investment_entries.id
  );

-- Fix profiles table RLS policy to prevent user enumeration
-- Drop the overly permissive policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a new policy that only allows users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix investment calculation logic by separating initial investment from transaction additions

-- Add initial_invested column to track the original investment amount
ALTER TABLE public.investment_entries 
ADD COLUMN initial_invested numeric;

-- Populate initial_invested with current invested values for existing records
UPDATE public.investment_entries 
SET initial_invested = invested;

-- Make initial_invested NOT NULL after populating
ALTER TABLE public.investment_entries 
ALTER COLUMN initial_invested SET NOT NULL;

-- Update the trigger function to use initial_invested
CREATE OR REPLACE FUNCTION public.update_investment_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_invested numeric;
  total_transaction_amount numeric;
  total_profit_loss numeric;
BEGIN
  -- Get the initial invested amount (this never changes)
  SELECT initial_invested INTO base_invested 
  FROM public.investment_entries 
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Get total transaction amounts for this investment
  SELECT COALESCE(SUM(amount), 0) INTO total_transaction_amount
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Get total profit/loss for this investment
  SELECT COALESCE(SUM(profit_loss), 0) INTO total_profit_loss
  FROM public.investment_transactions 
  WHERE investment_id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  -- Update the investment entry
  -- invested = base investment + all transaction amounts
  -- current = invested + profit/loss
  UPDATE public.investment_entries 
  SET 
    invested = base_invested + total_transaction_amount,
    current = base_invested + total_transaction_amount + total_profit_loss
  WHERE id = COALESCE(NEW.investment_id, OLD.investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create conversations table (supports both group and individual chats)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('group', 'individual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create conversation participants table
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they are part of"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update conversations they are part of"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add themselves to conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove themselves from conversations"
ON public.conversation_participants
FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages from their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Trigger to update conversation timestamp when new message is added
CREATE TRIGGER update_conversation_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Data API grants (required on this backend)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations, public.conversation_participants, public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_participants, public.messages TO service_role;