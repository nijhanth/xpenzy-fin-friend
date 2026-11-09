-- Allow an investment holding created or updated from a statement to be linked to a reminder.
ALTER TABLE public.investment_entries
  ADD COLUMN IF NOT EXISTS linked_note_id UUID
  REFERENCES public.notes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS investment_entries_linked_note_id_key
  ON public.investment_entries (linked_note_id)
  WHERE linked_note_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
