-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they are part of" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

-- Create a security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conversation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversation_uuid
    AND user_id = user_uuid
  );
$$;

-- Recreate policies using the helper function
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can view conversations they are part of"
ON public.conversations
FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Users can update conversations they are part of"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Users can view messages from their conversations"
ON public.messages
FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- Add email column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email);
  RETURN NEW;
END;
$$;

-- Drop the restrictive RLS policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new RLS policy that allows users to view all profiles (needed for search)
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Backfill email for existing profiles
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id AND p.email IS NULL;

-- Fix RLS policy for conversations to allow proper creation
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (true);

-- Update the policy to check if user becomes a participant after insert
-- This is safer and allows the insert to succeed
CREATE POLICY "Users can only create conversations they participate in"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Fix RLS policies for conversations to allow proper creation and selection

-- First, drop the duplicate SELECT policies
DROP POLICY IF EXISTS "Users can only create conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON public.conversations;

-- Create a single, correct SELECT policy that allows users to see conversations they created
-- OR conversations they participate in (after participants are added)
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  -- Allow viewing conversations the user participates in
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Fix INSERT policy for conversations to allow creation without WITH CHECK restriction

-- The issue is that WITH CHECK (true) allows insertion, but then the SELECT policy
-- prevents returning the created row. We need to adjust this.

-- Drop the current INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a proper INSERT policy that doesn't restrict WITH CHECK
-- Since participants are added AFTER conversation creation, we can't check participation yet
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Check and fix the INSERT policy for conversations
-- The issue is the policy role might not be set correctly

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create INSERT policy that allows authenticated users to insert
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a new INSERT policy with explicit role targeting
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix the INSERT policy to work with the public role like other policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create INSERT policy for public role (includes authenticated users)
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);