-- Keep an expense's reminder association available when the expense is edited.
ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS linked_note_id UUID
  REFERENCES public.notes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expense_entries_linked_note_id_idx
  ON public.expense_entries (linked_note_id)
  WHERE linked_note_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
