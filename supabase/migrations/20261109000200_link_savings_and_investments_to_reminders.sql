-- Allow savings and investment transactions to retain their reminder association.
ALTER TABLE public.savings_transactions
  ADD COLUMN IF NOT EXISTS linked_note_id UUID
  REFERENCES public.notes(id) ON DELETE SET NULL;

ALTER TABLE public.investment_transactions
  ADD COLUMN IF NOT EXISTS linked_note_id UUID
  REFERENCES public.notes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS savings_transactions_linked_note_id_key
  ON public.savings_transactions (linked_note_id)
  WHERE linked_note_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS investment_transactions_linked_note_id_key
  ON public.investment_transactions (linked_note_id)
  WHERE linked_note_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';