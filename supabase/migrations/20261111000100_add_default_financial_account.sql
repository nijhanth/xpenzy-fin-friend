ALTER TABLE public.financial_accounts
  ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX financial_accounts_one_default_per_user_idx
  ON public.financial_accounts(user_id)
  WHERE is_default;

CREATE OR REPLACE FUNCTION public.set_default_financial_account(p_account_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.financial_accounts
    WHERE id = p_account_id
      AND user_id = auth.uid()
      AND is_active
  ) THEN
    RAISE EXCEPTION 'Account not found or inactive';
  END IF;

  UPDATE public.financial_accounts
  SET is_default = FALSE
  WHERE user_id = auth.uid()
    AND is_default;

  IF p_account_id IS NOT NULL THEN
    UPDATE public.financial_accounts
    SET is_default = TRUE
    WHERE id = p_account_id
      AND user_id = auth.uid();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_financial_account(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
