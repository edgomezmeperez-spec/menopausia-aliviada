import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, UserCog, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ajustes")({
  component: AjustesPage,
  head: () => ({
    meta: [
      { title: "Ajustes y recordatorios · Menopausia Sin Hinchazón" },
      { name: "description", content: "Configurá tu recordatorio diario por email y actualizá los datos de tu perfil de menopausia." },
      { property: "og:title", content: "Ajustes y recordatorios" },
      { property: "og:description", content: "Elegí a qué hora querés recibir tu recordatorio diario de registro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const HOURS = [7, 8, 9, 12, 15, 18, 20, 21, 22];

function AjustesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(21);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("reminder_enabled,reminder_hour").eq("user_id", user.id).maybeSingle();
      if (data) {
        setEnabled(data.reminder_enabled);
        setHour(data.reminder_hour);
      }
      setLoading(false);
    })();
  }, []);

  async function save(next: { enabled?: boolean; hour?: number }) {
    const newEnabled = next.enabled ?? enabled;
    const newHour = next.hour ?? hour;
    setEnabled(newEnabled);
    setHour(newHour);
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      reminder_enabled: newEnabled,
      reminder_hour: newHour,
      reminder_email: user.email ?? null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Argentina/Buenos_Aires",
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("No pudimos guardar: " + error.message);
    else toast.success("Preferencias guardadas");
  }

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Cargando ajustes…</div>;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Tu cuenta</p>
        <h1 className="mt-1 font-display text-[2rem] font-semibold leading-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalizá cómo te acompañamos día a día.</p>
      </header>

      <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Recordatorio diario por email</p>
              <p className="text-[11px] text-muted-foreground">Te avisamos para que registres tu día en un minuto.</p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={v => save({ enabled: v })} disabled={saving} />
        </div>

        {enabled && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">Horario</p>
            <div className="grid grid-cols-3 gap-2">
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => save({ hour: h })}
                  className={`rounded-2xl border px-2 py-2.5 text-sm transition ${
                    hour === h ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"
                  }`}
                >{String(h).padStart(2, "0")}:00</button>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> Se envía a {email}
            </p>
          </div>
        )}
      </Card>

      <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <UserCog className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Tu perfil</p>
            <p className="text-[11px] text-muted-foreground">Etapa, síntomas, objetivos y alimentación.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-2xl">
            <Link to="/onboarding">Editar</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
