CREATE TABLE public.ai_user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory text NOT NULL CHECK (char_length(memory) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, memory)
);

CREATE INDEX idx_ai_user_memories_user_created
  ON public.ai_user_memories(user_id, created_at DESC);

ALTER TABLE public.ai_user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own AI memories"
  ON public.ai_user_memories
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.ai_user_memories TO authenticated;
