
CREATE TABLE public.daily_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bloating SMALLINT NOT NULL CHECK (bloating BETWEEN 1 AND 10),
  energy SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 10),
  sleep SMALLINT NOT NULL CHECK (sleep BETWEEN 1 AND 10),
  woke_2_4am BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_entries TO authenticated;
GRANT ALL ON public.daily_entries TO service_role;

ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own entries" ON public.daily_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER daily_entries_updated_at BEFORE UPDATE ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
