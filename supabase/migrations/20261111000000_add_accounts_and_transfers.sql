CREATE TABLE public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  bank_name TEXT NOT NULL CHECK (char_length(bank_name) BETWEEN 1 AND 80),
  account_type TEXT NOT NULL CHECK (account_type IN ('savings', 'current', 'salary', 'cash', 'wallet', 'other')),
  branch_name TEXT,
  ifsc_code TEXT CHECK (ifsc_code IS NULL OR ifsc_code ~ '^[A-Za-z]{4}0[A-Za-z0-9]{6}$'),
  last_four TEXT CHECK (last_four IS NULL OR last_four ~ '^[0-9]{4}$'),
  opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  opening_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own financial accounts"
  ON public.financial_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_financial_accounts_updated_at
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.income_entries
  ADD COLUMN account_id UUID;
ALTER TABLE public.income_entries
  ADD CONSTRAINT income_entries_account_owner_fkey
  FOREIGN KEY (account_id, user_id) REFERENCES public.financial_accounts(id, user_id) ON DELETE SET NULL (account_id);

ALTER TABLE public.expense_entries
  ADD COLUMN account_id UUID;
ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_account_owner_fkey
  FOREIGN KEY (account_id, user_id) REFERENCES public.financial_accounts(id, user_id) ON DELETE SET NULL (account_id);

ALTER TABLE public.savings_transactions
  ADD COLUMN account_id UUID;
ALTER TABLE public.savings_transactions
  ADD CONSTRAINT savings_transactions_account_owner_fkey
  FOREIGN KEY (account_id, user_id) REFERENCES public.financial_accounts(id, user_id) ON DELETE SET NULL (account_id);

ALTER TABLE public.investment_transactions
  ADD COLUMN account_id UUID;
ALTER TABLE public.investment_transactions
  ADD CONSTRAINT investment_transactions_account_owner_fkey
  FOREIGN KEY (account_id, user_id) REFERENCES public.financial_accounts(id, user_id) ON DELETE SET NULL (account_id);

CREATE UNIQUE INDEX savings_goals_id_user_id_key ON public.savings_goals(id, user_id);

CREATE TABLE public.account_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL,
  to_account_id UUID NOT NULL,
  savings_goal_id UUID,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_account_id <> to_account_id),
  UNIQUE (id, user_id),
  FOREIGN KEY (from_account_id, user_id) REFERENCES public.financial_accounts(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (to_account_id, user_id) REFERENCES public.financial_accounts(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (savings_goal_id, user_id) REFERENCES public.savings_goals(id, user_id) ON DELETE SET NULL (savings_goal_id)
);

ALTER TABLE public.savings_transactions
  ADD COLUMN account_transfer_id UUID UNIQUE;
ALTER TABLE public.savings_transactions
  ADD CONSTRAINT savings_transactions_account_transfer_owner_fkey
  FOREIGN KEY (account_transfer_id, user_id) REFERENCES public.account_transfers(id, user_id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.record_account_transfer_savings_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.savings_goal_id IS NOT NULL THEN
    INSERT INTO public.savings_transactions (
      user_id, savings_goal_id, amount, date, notes, account_transfer_id
    ) VALUES (
      NEW.user_id,
      NEW.savings_goal_id,
      NEW.amount,
      NEW.date,
      'Contribution from account transfer',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER record_account_transfer_savings_contribution_on_insert
  AFTER INSERT ON public.account_transfers
  FOR EACH ROW EXECUTE FUNCTION public.record_account_transfer_savings_contribution();

ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own account transfers"
  ON public.account_transfers FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.financial_accounts,
  public.account_transfers
TO authenticated;

CREATE INDEX financial_accounts_user_active_idx ON public.financial_accounts(user_id, is_active);
CREATE INDEX account_transfers_user_date_idx ON public.account_transfers(user_id, date DESC);
CREATE INDEX account_transfers_from_account_idx ON public.account_transfers(from_account_id);
CREATE INDEX account_transfers_to_account_idx ON public.account_transfers(to_account_id);

NOTIFY pgrst, 'reload schema';
