import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LogOut, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

function ScaleInput({
  label, emoji, value, onChange, lowLabel, highLabel,
}: { label: string; emoji: string; value: number; onChange: (n: number) => void; lowLabel: string; highLabel: string }) {
  return (
    <Card className="rounded-2xl border-0 p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{emoji} {label}</p>
          <p className="text-xs text-muted-foreground">{lowLabel} → {highLabel}</p>
        </div>
        <span className="text-2xl font-semibold text-primary">{value}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-10 flex-1 rounded-lg text-sm font-medium transition ${
              n <= value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"
            }`}
          >{n}</button>
        ))}
      </div>
    </Card>
  );
}

function InicioPage() {
  const navigate = useNavigate();
  const [bloating, setBloating] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [wokeUp, setWokeUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ""));
    // Load today's existing entry
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("daily_entries").select("*").eq("entry_date", today).maybeSingle().then(({ data }) => {
      if (data) {
        setBloating(data.bloating);
        setEnergy(data.energy);
        setSleep(data.sleep);
        setWokeUp(data.woke_2_4am);
      }
    });
  }, []);

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
    else toast.success("Registro guardado ✨");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const today = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Hoy · {today}</p>
          <h1 className="mt-1 text-3xl font-semibold">¿Cómo te sientes?</h1>
          {userEmail && <p className="mt-1 text-xs text-muted-foreground">{userEmail}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Cerrar sesión">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <div className="rounded-2xl p-5" style={{ background: "var(--gradient-warm)" }}>
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-sm text-foreground">Registrar tus síntomas a diario te ayuda a notar patrones.</p>
        </div>
      </div>

      <ScaleInput label="Inflamación abdominal" emoji="🌸" value={bloating} onChange={setBloating} lowLabel="Sin hinchazón" highLabel="Muy hinchada" />
      <ScaleInput label="Energía" emoji="⚡" value={energy} onChange={setEnergy} lowLabel="Agotada" highLabel="Llena de energía" />
      <ScaleInput label="Calidad del sueño" emoji="🌙" value={sleep} onChange={setSleep} lowLabel="Muy mala" highLabel="Excelente" />

      <Card className="rounded-2xl border-0 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">🕑 ¿Te despertaste entre las 2 y las 4 AM?</p>
            <p className="mt-1 text-xs text-muted-foreground">Despertares en este rango pueden indicar fluctuaciones hormonales.</p>
          </div>
          <Switch checked={wokeUp} onCheckedChange={setWokeUp} />
        </div>
      </Card>

      <Button onClick={save} disabled={saving} className="h-12 w-full rounded-full text-base shadow-[var(--shadow-soft)]">
        {saving ? "Guardando..." : "Guardar registro de hoy"}
      </Button>
    </div>
  );
}
