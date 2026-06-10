import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/_authenticated/historial")({
  component: HistorialPage,
});

type Entry = {
  entry_date: string;
  bloating: number;
  energy: number;
  sleep: number;
  woke_2_4am: boolean;
};

const RANGES = [
  { key: 7, label: "7 días" },
  { key: 30, label: "30 días" },
  { key: 90, label: "90 días" },
] as const;

function HistorialPage() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    supabase.from("daily_entries")
      .select("entry_date,bloating,energy,sleep,woke_2_4am")
      .gte("entry_date", since)
      .order("entry_date", { ascending: true })
      .then(({ data }) => setEntries((data ?? []) as Entry[]));
  }, [days]);

  const data = useMemo(() => entries.map(e => ({
    fecha: new Date(e.entry_date).toLocaleDateString("es", { day: "numeric", month: "short" }),
    inflamacion: e.bloating,
    energia: e.energy,
    sueno: e.sleep,
    despertar: e.woke_2_4am ? 1 : 0,
  })), [entries]);

  const wakeCount = entries.filter(e => e.woke_2_4am).length;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Tu evolución</p>
        <h1 className="mt-1 text-3xl font-semibold">Historial</h1>
      </header>

      <div className="flex gap-2 rounded-full bg-muted p-1">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setDays(r.key)}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${days === r.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >{r.label}</button>
        ))}
      </div>

      {entries.length === 0 ? (
        <Card className="rounded-2xl border-0 p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-sm text-muted-foreground">Aún no hay registros en este período.</p>
          <p className="mt-1 text-xs text-muted-foreground">Comienza guardando tu registro de hoy.</p>
        </Card>
      ) : (
        <>
          <ChartCard title="🌸 Inflamación abdominal" data={data} dataKey="inflamacion" color="var(--chart-1)" />
          <ChartCard title="⚡ Energía" data={data} dataKey="energia" color="var(--chart-2)" />
          <ChartCard title="🌙 Calidad del sueño" data={data} dataKey="sueno" color="var(--chart-3)" />
          <Card className="rounded-2xl border-0 p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">🕑 Despertares 2-4 AM</h3>
              <span className="text-xs text-muted-foreground">{wakeCount} de {entries.length} noches</span>
            </div>
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="fecha" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis hide domain={[0, 1]} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
                  <Bar dataKey="despertar" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, data, dataKey, color }: { title: string; data: any[]; dataKey: string; color: string }) {
  const avg = data.length ? (data.reduce((s, d) => s + d[dataKey], 0) / data.length).toFixed(1) : "—";
  return (
    <Card className="rounded-2xl border-0 p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">Promedio: <strong className="text-foreground">{avg}</strong></span>
      </div>
      <div className="h-44">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="fecha" fontSize={11} stroke="var(--muted-foreground)" />
            <YAxis domain={[0, 10]} fontSize={11} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
