import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock, MapPin, Plus, Trash2, MessageSquareHeart, BellRing } from "lucide-react";

type Appointment = {
  id: string;
  scheduled_at: string;
  doctor_name: string | null;
  location: string | null;
  reason: string | null;
  doctor_notes: string | null;
  followed_up: boolean;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}
function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AppointmentsSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [doctor, setDoctor] = useState("");
  const [place, setPlace] = useState("");
  const [reason, setReason] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, doctor_name, location, reason, doctor_notes, followed_up")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
  });

  const now = Date.now();
  const upcoming = useMemo(
    () => appointments.filter(a => new Date(a.scheduled_at).getTime() >= now),
    [appointments, now],
  );
  const pendingFeedback = useMemo(
    () => appointments.filter(a => new Date(a.scheduled_at).getTime() < now && !a.followed_up),
    [appointments, now],
  );
  const past = useMemo(
    () =>
      appointments
        .filter(a => new Date(a.scheduled_at).getTime() < now && a.followed_up)
        .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    [appointments, now],
  );

  // Aviso en la app cuando falta poco para la consulta
  useEffect(() => {
    const next = upcoming[0];
    if (!next) return;
    const d = daysUntil(next.scheduled_at);
    if (d <= 1) {
      toast(d <= 0 ? "Tu consulta es hoy" : "Tu consulta es mañana", {
        description: `${fmtDate(next.scheduled_at)} a las ${fmtTime(next.scheduled_at)}`,
        id: `apt-${next.id}`,
      });
    }
  }, [upcoming]);

  const create = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sesión no encontrada");
      const { error } = await supabase.from("appointments").insert({
        user_id: uid,
        scheduled_at: new Date(when).toISOString(),
        doctor_name: doctor || null,
        location: place || null,
        reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consulta agendada");
      setOpen(false); setWhen(""); setDoctor(""); setPlace(""); setReason("");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ doctor_notes: notes, followed_up: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guardado. Gracias por contarnos.");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Mis citas médicas</h2>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => {
          setOpen(o => !o);
          if (!when) setWhen(toLocalInput(new Date(Date.now() + 86400000)));
        }}>
          <Plus className="mr-1 h-4 w-4" /> Agendar
        </Button>
      </div>

      {open && (
        <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="apt-when">Fecha y hora</Label>
              <Input id="apt-when" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apt-doc">Profesional (opcional)</Label>
              <Input id="apt-doc" value={doctor} onChange={e => setDoctor(e.target.value)} placeholder="Dra. Pérez" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apt-place">Lugar (opcional)</Label>
              <Input id="apt-place" value={place} onChange={e => setPlace(e.target.value)} placeholder="Clínica del centro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apt-reason">Motivo (opcional)</Label>
              <Input id="apt-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Control de síntomas" />
            </div>
            <Button
              className="h-11 w-full rounded-full"
              disabled={!when || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Guardando..." : "Guardar cita"}
            </Button>
          </div>
        </Card>
      )}

      {pendingFeedback.map(a => (
        <Card key={a.id} className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquareHeart className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">¿Qué te dijo el médico?</p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Consulta del {fmtDate(a.scheduled_at)}{a.doctor_name ? ` con ${a.doctor_name}` : ""}. Anota lo que te indicaron para tenerlo siempre a mano.
          </p>
          <Textarea
            rows={4}
            value={notesDraft[a.id] ?? ""}
            onChange={e => setNotesDraft(s => ({ ...s, [a.id]: e.target.value }))}
            placeholder="Indicaciones, estudios pedidos, tratamiento, próximos pasos..."
            className="rounded-2xl"
          />
          <div className="mt-3 flex gap-2">
            <Button
              className="h-10 flex-1 rounded-full"
              disabled={!(notesDraft[a.id] ?? "").trim() || saveNotes.isPending}
              onClick={() => saveNotes.mutate({ id: a.id, notes: (notesDraft[a.id] ?? "").trim() })}
            >
              Guardar
            </Button>
            <Button variant="ghost" className="h-10 rounded-full" onClick={() => remove.mutate(a.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {upcoming.map(a => {
        const d = daysUntil(a.scheduled_at);
        return (
          <Card key={a.id} className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-primary">
                  <CalendarDays className="h-4 w-4" />
                  <p className="text-sm font-semibold capitalize">{fmtDate(a.scheduled_at)}</p>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtTime(a.scheduled_at)}</span>
                  {a.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.location}</span>}
                </div>
                {a.doctor_name && <p className="mt-1 text-xs text-muted-foreground">{a.doctor_name}</p>}
                {a.reason && <p className="mt-1 text-xs text-foreground">{a.reason}</p>}
                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                  <BellRing className="h-3.5 w-3.5" />
                  {d <= 0 ? "Es hoy" : d === 1 ? "Es mañana" : `Faltan ${d} días`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => remove.mutate(a.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </Card>
        );
      })}

      {past.length > 0 && (
        <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
          <p className="mb-3 text-sm font-semibold">Consultas anteriores</p>
          <div className="space-y-3">
            {past.slice(0, 5).map(a => (
              <div key={a.id} className="rounded-2xl bg-muted/50 p-3">
                <p className="text-xs font-medium capitalize text-foreground">{fmtDate(a.scheduled_at)}</p>
                {a.doctor_notes && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{a.doctor_notes}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {appointments.length === 0 && !open && (
        <p className="text-xs text-muted-foreground">Todavía no agendaste ninguna consulta. Al agendarla te avisamos cuando se acerque y después te preguntamos qué te dijo el médico.</p>
      )}
    </section>
  );
}
