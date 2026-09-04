CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  birth_year smallint,
  stage text,
  main_symptoms text[] NOT NULL DEFAULT '{}',
  goals text[] NOT NULL DEFAULT '{}',
  diet_notes text,
  onboarded_at timestamptz,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_hour smallint NOT NULL DEFAULT 21,
  reminder_email text,
  timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  last_reminder_sent_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();