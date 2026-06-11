
CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'consejo',
  source text NOT NULL DEFAULT 'consejo_hoy',
  for_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recommendations" ON public.recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX recommendations_user_date_idx ON public.recommendations (user_id, for_date DESC);

CREATE TABLE public.recommendation_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  followed text NOT NULL CHECK (followed IN ('si','parcial','no')),
  feeling text CHECK (feeling IN ('mucho_mejor','algo_mejor','igual','peor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recommendation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_followups TO authenticated;
GRANT ALL ON public.recommendation_followups TO service_role;
ALTER TABLE public.recommendation_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own followups" ON public.recommendation_followups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX followups_user_idx ON public.recommendation_followups (user_id, created_at DESC);

CREATE TRIGGER recommendation_followups_set_updated_at
BEFORE UPDATE ON public.recommendation_followups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
