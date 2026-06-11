import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LogOut, Sparkles, Flame, TrendingUp, Moon, Zap, Wind, Lightbulb, RefreshCw, CheckCircle2, HelpCircle } from "lucide-react";
import { generarConsejoHoy, obtenerSeguimientoPendiente, responderSeguimiento } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

type Entry = {
  entry_date: string;
  bloating: number;
  energy: number;
  sleep: number;
  woke_2_4am: boolean;
};

function ScaleInput({
  label, icon: Icon, value, onChange, lowLabel, highLabel, accent,
}: { label: string; icon: any; value: number; onChange: (n: number) => void; lowLabel: string; highLabel: string; accent: string }) {
  return (
    <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)` }}>
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground">{lowLabel} → {highLabel}</p>
          </div>
        </div>
        <span className="font-display text-3xl font-semibold" style={{ color: accent }}>{value}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 flex-1 rounded-md text-xs font-medium transition ${
              n <= value ? "text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-secondary"
            }`}
            style={n <= value ? { background: accent } : undefined}
          >{n}</button>
        ))}
      </div>
    </Card>
  );
}

function wellbeingScore(bloating: number, energy: number, sleep: number, woke: boolean) {
  const base = ((10 - bloating) + energy + sleep) / 3;
  const adjusted = woke ? base - 0.6 : base;
  return Math.max(0, Math.min(10, adjusted));
}

function wellbeingLabel(score: number) {
  if (score >= 8) return { label: "Excelente", color: "oklch(0.7 0.13 160)" };
  if (score >= 6) return { label: "Bueno", color: "oklch(0.72 0.13 90)" };
  if (score >= 4) return { label: "Regular", color: "oklch(0.72 0.13 60)" };
  return { label: "Necesita atención", color: "oklch(0.65 0.18 25)" };
}

function InicioPage() {
  const navigate = useNavigate();
  const [bloating, setBloating] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [wokeUp, setWokeUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [history, setHistory] = useState<Entry[]>([]);
  const [savedToday, setSavedToday] = useState(false);

  // Consejo de hoy
  const consejoFn = useServerFn(generarConsejoHoy);
  const seguimientoFn = useServerFn(obtenerSeguimientoPendiente);
  const responderFn = useServerFn(responderSeguimiento);
  const [consejo, setConsejo] = useState<{ id: string; content: string; category: string } | null>(null);
  const [loadingConsejo, setLoadingConsejo] = useState(false);
  const [pendiente, setPendiente] = useState<{ id: string; content: string } | null>(null);
  const [lastFollowup, setLastFollowup] = useState<{ recommendation: { content: string }; followup: { followed: string; feeling: string | null } } | null>(null);
  const [followedAnswer, setFollowedAnswer] = useState<"si" | "parcial" | "no" | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? "";
      const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      setUserName(meta.full_name?.split(" ")[0] || meta.name?.split(" ")[0] || email.split("@")[0] || "");
    });
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    supabase.from("daily_entries")
      .select("entry_date,bloating,energy,sleep,woke_2_4am")
      .gte("entry_date", since)
      .order("entry_date", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as Entry[];
        setHistory(list);
        const today = new Date().toISOString().slice(0, 10);
        const todayEntry = list.find(e => e.entry_date === today);
        if (todayEntry) {
          setBloating(todayEntry.bloating);
          setEnergy(todayEntry.energy);
          setSleep(todayEntry.sleep);
          setWokeUp(todayEntry.woke_2_4am);
          setSavedToday(true);
        }
      });

    // Cargar consejo de hoy y seguimiento pendiente en paralelo
    consejoFn({ data: { force: false } })
      .then(res => setConsejo(res.recommendation as any))
      .catch(() => { /* silencioso, mostramos botón manual */ });

    seguimientoFn({ data: {} })
      .then(res => {
        if (res.pending) setPendiente(res.pending as any);
        else if (res.lastFollowup) setLastFollowup(res.lastFollowup as any);
      })
      .catch(() => {});
  }, []);

  const streak = useMemo(() => {
    if (history.length === 0) return 0;
    const dates = new Set(history.map(e => e.entry_date));
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Allow streak to start either today or yesterday (don't break streak if today not yet registered)
    let cursor = new Date(today);
    if (!dates.has(cursor.toISOString().slice(0, 10))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!dates.has(cursor.toISOString().slice(0, 10))) return 0;
    }
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [history]);

  const wellbeing = wellbeingScore(bloating, energy, sleep, wokeUp);
  const { label: wellLabel, color: wellColor } = wellbeingLabel(wellbeing);
  const wellPercent = Math.round((wellbeing / 10) * 100);

  async function save() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("daily_entries").upsert({
      user_id: userData.user.id,
      entry_date: today,
      bloating, energy, sleep, woke_2_4am: wokeUp,
    }, { onConflict: "user_id,entry_date" });
    setSaving(false);
    if (error) toast.error("No pudimos guardar: " + error.message);
    else {
      toast.success("Registro guardado ✨");
      setSavedToday(true);
      // refresh history quickly
      setHistory(prev => {
        const filtered = prev.filter(e => e.entry_date !== today);
        return [{ entry_date: today, bloating, energy, sleep, woke_2_4am: wokeUp }, ...filtered];
      });
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function regenerarConsejo() {
    setLoadingConsejo(true);
    try {
      const res = await consejoFn({ data: { force: true } });
      setConsejo(res.recommendation as any);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoadingConsejo(false);
    }
  }

  async function enviarSeguimiento(feeling: "mucho_mejor" | "algo_mejor" | "igual" | "peor" | null) {
    if (!pendiente || !followedAnswer) return;
    try {
      await responderFn({ data: { recommendationId: pendiente.id, followed: followedAnswer, feeling } });
      toast.success("¡Gracias por contarnos!");
      setLastFollowup({ recommendation: { content: pendiente.content }, followup: { followed: followedAnswer, feeling } });
      setPendiente(null);
      setFollowedAnswer(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const today = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{today}</p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold leading-tight">
            {greeting}{userName ? `, ${userName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Cuidarte cada día es un acto de amor propio.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Cerrar sesión">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Wellbeing indicator */}
      <Card className="overflow-hidden rounded-3xl border-0 p-6 text-white shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Tu bienestar hoy</p>
            <p className="mt-1 font-display text-4xl font-semibold">{wellbeing.toFixed(1)}<span className="text-xl opacity-80">/10</span></p>
            <p className="mt-1 text-sm font-medium">{wellLabel}</p>
          </div>
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="3" strokeDasharray={`${wellPercent}, 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{wellPercent}%</span>
          </div>
        </div>
      </Card>

      {/* Streak + Today summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-3xl border-0 p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5" style={{ color: "oklch(0.7 0.18 40)" }} /> Racha
          </div>
          <p className="mt-1 font-display text-3xl font-semibold">{streak}<span className="ml-1 text-sm text-muted-foreground">{streak === 1 ? "día" : "días"}</span></p>
          <p className="text-[11px] text-muted-foreground">consecutivos registrando</p>
        </Card>
        <Card className="rounded-3xl border-0 p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Resumen de hoy
          </div>
          <div className="mt-1.5 flex items-baseline gap-2.5 text-sm">
            <span title="Inflamación">🌸 <strong>{bloating}</strong></span>
            <span title="Energía">⚡ <strong>{energy}</strong></span>
            <span title="Sueño">🌙 <strong>{sleep}</strong></span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{wokeUp ? "Despertaste 2-4 AM" : "Sin despertares 2-4 AM"}</p>
        </Card>
      </div>

      {/* Seguimiento de recomendaciones de ayer */}
      {pendiente && (
        <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-warm)" }}>
          <div className="mb-3 flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">¿Probaste la recomendación de ayer?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">"{pendiente.content}"</p>
            </div>
          </div>
          {!followedAnswer ? (
            <div className="grid grid-cols-3 gap-2">
              {([["si", "Sí"], ["parcial", "Parcialmente"], ["no", "No"]] as const).map(([val, lbl]) => (
                <Button
                  key={val}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    if (val === "no") {
                      // si dice no, no preguntamos feeling
                      setFollowedAnswer(val);
                      enviarSeguimiento(null);
                    } else {
                      setFollowedAnswer(val);
                    }
                  }}
                >{lbl}</Button>
              ))}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs font-medium text-foreground">¿Cómo te sentiste?</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["mucho_mejor", "Mucho mejor"],
                  ["algo_mejor", "Algo mejor"],
                  ["igual", "Igual"],
                  ["peor", "Peor"],
                ] as const).map(([val, lbl]) => (
                  <Button key={val} variant="outline" size="sm" className="rounded-full" onClick={() => enviarSeguimiento(val)}>{lbl}</Button>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Consejo de hoy */}
      <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-semibold">Consejo de hoy</p>
          </div>
          <Button variant="ghost" size="icon" onClick={regenerarConsejo} disabled={loadingConsejo} aria-label="Regenerar">
            <RefreshCw className={`h-4 w-4 ${loadingConsejo ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {consejo ? (
          <p className="text-sm leading-relaxed text-foreground">{consejo.content}</p>
        ) : (
          <Button onClick={regenerarConsejo} disabled={loadingConsejo} variant="outline" className="w-full rounded-full">
            {loadingConsejo ? "Generando..." : "Generar consejo personalizado"}
          </Button>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Orientación general de bienestar. No reemplaza la atención médica profesional.</p>
      </Card>

      {/* Seguimiento - último resultado */}
      {lastFollowup && (
        <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Seguimiento de recomendaciones</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Último consejo:</p>
          <p className="mt-1 text-sm text-foreground">"{lastFollowup.recommendation.content}"</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
              {lastFollowup.followup.followed === "si" ? "✓ Realizado" : lastFollowup.followup.followed === "parcial" ? "◐ Parcialmente" : "✗ No realizado"}
            </span>
            {lastFollowup.followup.feeling && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                {({ mucho_mejor: "Te sentiste mucho mejor", algo_mejor: "Te sentiste algo mejor", igual: "Te sentiste igual", peor: "Te sentiste peor" } as Record<string, string>)[lastFollowup.followup.feeling]}
              </span>
            )}
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{savedToday ? "Actualiza tu registro" : "Registra cómo te sientes hoy"}</p>
      </div>

      <ScaleInput label="Inflamación abdominal" icon={Wind} value={bloating} onChange={setBloating} lowLabel="Sin hinchazón" highLabel="Muy hinchada" accent="oklch(0.65 0.15 10)" />
      <ScaleInput label="Fatiga / energía" icon={Zap} value={energy} onChange={setEnergy} lowLabel="Agotada" highLabel="Llena de energía" accent="oklch(0.72 0.14 60)" />
      <ScaleInput label="Calidad del sueño" icon={Moon} value={sleep} onChange={setSleep} lowLabel="Muy mala" highLabel="Excelente" accent="oklch(0.65 0.13 280)" />

      <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/40">
              <Moon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Despertar entre las 2 y las 4 AM</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Este rango puede indicar fluctuaciones hormonales.</p>
            </div>
          </div>
          <Switch checked={wokeUp} onCheckedChange={setWokeUp} />
        </div>
      </Card>

      <Button onClick={save} disabled={saving} className="h-12 w-full rounded-full text-base shadow-[var(--shadow-soft)]">
        {saving ? "Guardando..." : savedToday ? "Actualizar registro de hoy" : "Guardar registro de hoy"}
      </Button>

      <Link to="/historial" className="block text-center text-xs font-medium text-primary underline-offset-4 hover:underline">
        Ver tu evolución completa →
      </Link>
    </div>
  );
}
