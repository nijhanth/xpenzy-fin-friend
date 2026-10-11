-- Do not create an application profile until the user's email is confirmed.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email)
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- Signup inserts an unconfirmed auth.users row so Supabase can send the OTP.
-- Create the app profile only when that pending user confirms their email.
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();
