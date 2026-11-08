-- Explicit API privileges for projects created with automatic table exposure disabled.
-- Row Level Security policies continue to limit each user to their own rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.income_entries,
  public.expense_entries,
  public.savings_goals,
  public.investment_entries,
  public.investment_transactions,
  public.savings_transactions,
  public.budget_categories,
  public.notes,
  public.user_preferences,
  public.ai_chat_messages,
  public.ai_user_memories,
  public.conversations,
  public.conversation_participants,
  public.messages
TO authenticated;
