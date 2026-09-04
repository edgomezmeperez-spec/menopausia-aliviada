import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Tu perfil · Menopausia Sin Hinchazón" },
      { name: "description", content: "Contanos un poco sobre vos para personalizar tus consejos, tu plan y el análisis de tus síntomas." },
      { property: "og:title", content: "Tu perfil · Menopausia Sin Hinchazón" },
      { property: "og:description", content: "Personalizá tu acompañamiento en menopausia en menos de dos minutos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STAGES = [
  { value: "premenopausia", label: "Premenopausia", hint: "Ciclos aún regulares" },
  { value: "perimenopausia", label: "Perimenopausia", hint: "Ciclos irregulares o cambios" },
  { value: "menopausia", label: "Menopausia", hint: "Más de 12 meses sin menstruar" },
  { value: "postmenopausia", label: "Postmenopausia", hint: "Varios años sin menstruar" },
  { value: "no_se", label: "No estoy segura", hint: "Lo iremos descubriendo juntas" },
];

const SYMPTOMS = [
  "Hinchazón abdominal",
  "Fatiga o cansancio",
  "Despertares 2-4 AM",
  "Sofocos",
  "Cambios de ánimo",
  "Dolor articular",
  "Niebla mental",
  "Aumento de peso",
];

const GOALS = [
  "Reducir la hinchazón",
  "Tener más energía",
  "Dormir toda la noche",
  "Sentirme más estable emocionalmente",
  "Mejorar mi alimentación",
  "Moverme más",
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [stage, setStage] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [dietNotes, setDietNotes] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderHour, setReminderHour] = useState(21);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setName(data.display_name ?? "");
        setBirthYear(data.birth_year ? String(data.birth_year) : "");
        setStage(data.stage ?? "");
        setSymptoms(data.main_symptoms ?? []);
        setGoals(data.goals ?? []);
        setDietNotes(data.diet_notes ?? "");
        setReminderEnabled(data.reminder_enabled ?? true);
        setReminderHour(data.reminder_hour ?? 21);
      } else {
        setName(meta.full_name?.split(" ")[0] || meta.name?.split(" ")[0] || "");
      }
      setLoading(false);
    })();
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  }

  async function finish() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const year = parseInt(birthYear, 10);
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      display_name: name.trim() || null,
      birth_year: Number.isFinite(year) && year > 1900 && year < 2020 ? year : null,
      stage: stage || null,
      main_symptoms: symptoms,
      goals,
      diet_notes: dietNotes.trim() || null,
      reminder_enabled: reminderEnabled,
      reminder_hour: reminderHour,
      reminder_email: user.email ?? null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Argentina/Buenos_Aires",
      onboarded_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("No pudimos guardar tu perfil: " + error.message);
      return;
    }
    toast.success("¡Listo! Ya podemos personalizar tu acompañamiento ✨");
    navigate({ to: "/inicio", replace: true });
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Preparando tu perfil…</div>;
  }

  const steps = [
    {
      title: "Contanos quién sos",
      subtitle: "Con tu nombre y tu edad podemos ajustar el tono y las recomendaciones.",
      valid: true,
      content: (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">¿Cómo querés que te llamemos?</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" className="rounded-2xl" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Año de nacimiento</label>
            <Input
              value={birthYear}
              onChange={e => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1975"
              className="rounded-2xl"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Solo lo usamos para contextualizar tus síntomas.</p>
          </div>
        </div>
      ),
    },
    {
      title: "¿En qué etapa estás?",
      subtitle: "Si no lo sabés con certeza, no pasa nada: elegí lo que más se acerque.",
      valid: !!stage,
      content: (
        <div className="space-y-2">
          {STAGES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStage(s.value)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                stage === s.value ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary"
              }`}
            >
              <span>
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="block text-[11px] text-muted-foreground">{s.hint}</span>
              </span>
              {stage === s.value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "¿Qué te está molestando más?",
      subtitle: "Elegí todo lo que sientas seguido. Podés cambiarlo cuando quieras.",
      valid: symptoms.length > 0,
      content: (
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map(s => (
            <Chip key={s} active={symptoms.includes(s)} onClick={() => toggle(symptoms, setSymptoms, s)}>{s}</Chip>
          ))}
        </div>
      ),
    },
    {
      title: "¿Qué te gustaría lograr?",
      subtitle: "Tus objetivos guían el plan y los consejos diarios.",
      valid: goals.length > 0,
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <Chip key={g} active={goals.includes(g)} onClick={() => toggle(goals, setGoals, g)}>{g}</Chip>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Alimentación o restricciones (opcional)</label>
            <Textarea
              value={dietNotes}
              onChange={e => setDietNotes(e.target.value)}
              placeholder="Ej: vegetariana, intolerante a la lactosa, evito el café…"
              className="min-h-[90px] rounded-2xl"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Recordatorio diario",
      subtitle: "Te enviamos un correo suave a la hora que elijas para que registres tu día en 1 minuto.",
      valid: true,
      content: (
        <div className="space-y-4">
          <Card className="flex items-center justify-between rounded-2xl border-0 p-4 shadow-[var(--shadow-soft)]">
            <div>
              <p className="text-sm font-medium">Quiero mi recordatorio por email</p>
              <p className="text-[11px] text-muted-foreground">Podés desactivarlo cuando quieras.</p>
            </div>
            <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
          </Card>
          {reminderEnabled && (
            <div>
              <label className="mb-2 block text-sm font-medium">¿A qué hora?</label>
              <div className="grid grid-cols-4 gap-2">
                {[8, 12, 18, 20, 21, 22].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setReminderHour(h)}
                    className={`rounded-2xl border px-2 py-2.5 text-sm transition ${
                      reminderHour === h ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"
                    }`}
                  >{String(h).padStart(2, "0")}:00</button>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <header>
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Paso {step + 1} de {steps.length}
        </p>
        <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight">{current.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
      </header>

      <div>{current.content}</div>

      <div className="flex gap-3 pb-4">
        {step > 0 && (
          <Button variant="outline" className="rounded-2xl" onClick={() => setStep(s => s - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Atrás
          </Button>
        )}
        <Button
          className="flex-1 rounded-2xl"
          disabled={!current.valid || saving}
          onClick={() => (isLast ? finish() : setStep(s => s + 1))}
        >
          {isLast ? (saving ? "Guardando…" : "Empezar") : "Continuar"}
          {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
