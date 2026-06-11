import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generarInsightsHistorial } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const generar = useServerFn(generarInsightsHistorial);

  useEffect(() => {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    supabase.from("daily_entries")
      .select("entry_date,bloating,energy,sleep,woke_2_4am")
      .gte("entry_date", since)
      .order("entry_date", { ascending: true })
      .then(({ data }) => setEntries((data ?? []) as Entry[]));
    setInsights(null);
  }, [days]);

  const data = useMemo(() => entries.map(e => ({
    fecha: new Date(e.entry_date).toLocaleDateString("es", { day: "numeric", month: "short" }),
    inflamacion: e.bloating,
    energia: e.energy,
    sueno: e.sleep,
    despertar: e.woke_2_4am ? 1 : 0,
  })), [entries]);

  const trends = useMemo(() => {
    if (entries.length < 4) return null;
    const mid = Math.floor(entries.length / 2);
    const a = entries.slice(0, mid);
    const b = entries.slice(mid);
    const t = (k: "bloating" | "energy" | "sleep") => {
      const av = a.reduce((s, e) => s + e[k], 0) / a.length;
      const bv = b.reduce((s, e) => s + e[k], 0) / b.length;
      return +(bv - av).toFixed(1);
    };
    return { bloating: t("bloating"), energy: t("energy"), sleep: t("sleep") };
  }, [entries]);

  const pattern = useMemo(() => {
    if (entries.length < 5) return null;
    const wakeEntries = entries.filter(e => e.woke_2_4am);
    const noWakeEntries = entries.filter(e => !e.woke_2_4am);
    if (wakeEntries.length < 2 || noWakeEntries.length < 2) return null;
    const avg = (arr: Entry[], k: "bloating" | "energy") => arr.reduce((s, e) => s + e[k], 0) / arr.length;
    const energyDiff = +(avg(noWakeEntries, "energy") - avg(wakeEntries, "energy")).toFixed(1);
    const bloatDiff = +(avg(wakeEntries, "bloating") - avg(noWakeEntries, "bloating")).toFixed(1);
    return { energyDiff, bloatDiff, wakeNights: wakeEntries.length };
  }, [entries]);

  const hasEnoughData = entries.length >= 7;
  const wakeCount = entries.filter(e => e.woke_2_4am).length;

  async function runInsights() {
    setLoadingInsights(true);
    try {
      const res = await generar({ data: { days } });
      setInsights(res.insights);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error generando insights");
    } finally {
      setLoadingInsights(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Tu evolución</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Historial</h1>
      </header>

      <div className="flex gap-1 rounded-full bg-muted p-1">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setDays(r.key)}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${days === r.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >{r.label}</button>
        ))}
      </div>

      {entries.length === 0 ? (
        <Card className="rounded-3xl border-0 p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-sm text-muted-foreground">Aún no hay registros en este período.</p>
          <p className="mt-1 text-xs text-muted-foreground">Comienza guardando tu registro de hoy.</p>
        </Card>
      ) : (
        <>
          {!hasEnoughData && (
            <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-warm)" }}>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 text-sm text-foreground">
                  <p className="font-semibold">Aún estamos conociéndote</p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">
                    Necesitamos más información para detectar patrones confiables. Continúa registrando tus síntomas diariamente y volveremos a analizar tus tendencias cuando tengamos suficientes datos.
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary">{entries.length} de 7 registros mínimos</p>
                </div>
              </div>
            </Card>
          )}

          {/* Trend chips — only with enough data */}
          {hasEnoughData && trends && (
            <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tendencias automáticas</p>
              <div className="grid grid-cols-3 gap-3">
                <TrendChip label="Inflamación" delta={trends.bloating} invert />
                <TrendChip label="Energía" delta={trends.energy} />
                <TrendChip label="Sueño" delta={trends.sleep} />
              </div>
            </Card>
          )}

          {/* Pattern detection — only with enough data */}
          {hasEnoughData && pattern && (
            <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-warm)" }}>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  <p className="font-semibold text-foreground">Patrón observado</p>
                  {pattern.wakeNights > 0 ? (
                    <>
                      {pattern.energyDiff > 0.5 && (
                        <p className="text-foreground">Tu energía parece ser <strong>{pattern.energyDiff} puntos mayor</strong> los días sin despertares 2-4 AM.</p>
                      )}
                      {pattern.bloatDiff > 0.5 && (
                        <p className="text-foreground">La inflamación tiende a subir <strong>{pattern.bloatDiff} puntos</strong> en días con despertares nocturnos.</p>
                      )}
                      {pattern.energyDiff <= 0.5 && pattern.bloatDiff <= 0.5 && (
                        <p className="text-muted-foreground">Los despertares 2-4 AM no parecen afectar significativamente tu energía ni inflamación en este período.</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">No has tenido despertares 2-4 AM en este período. ¡Excelente señal!</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* AI Insights — only with enough data */}
          {hasEnoughData && (
            <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Insights con IA</p>
                  <p className="text-[11px] text-muted-foreground">Análisis personalizado de tus registros</p>
                </div>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              {insights ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{insights}</div>
              ) : (
                <Button onClick={runInsights} disabled={loadingInsights} className="w-full rounded-full">
                  {loadingInsights ? "Analizando tus datos..." : "Generar insights con IA"}
                </Button>
              )}
              {insights && (
                <Button variant="outline" size="sm" onClick={runInsights} disabled={loadingInsights} className="mt-3 w-full rounded-full">
                  {loadingInsights ? "Regenerando..." : "Regenerar"}
                </Button>
              )}
            </Card>
          )}

          <ChartCard title="🌸 Inflamación abdominal" data={data} dataKey="inflamacion" color="var(--chart-1)" />
          <ChartCard title="⚡ Energía" data={data} dataKey="energia" color="var(--chart-2)" />
          <ChartCard title="🌙 Calidad del sueño" data={data} dataKey="sueno" color="var(--chart-3)" />
          <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
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

function TrendChip({ label, delta, invert }: { label: string; delta: number; invert?: boolean }) {
  // For "invert" metrics (inflamación), down is good.
  const isFlat = Math.abs(delta) < 0.3;
  const isGood = isFlat ? false : invert ? delta < 0 : delta > 0;
  const isBad = isFlat ? false : invert ? delta > 0 : delta < 0;
  const color = isGood ? "oklch(0.65 0.14 160)" : isBad ? "oklch(0.65 0.18 25)" : "var(--muted-foreground)";
  const Icon = isFlat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const text = isFlat ? "Estable" : `${delta > 0 ? "+" : ""}${delta}`;
  return (
    <div className="rounded-2xl bg-muted/50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-center gap-1" style={{ color }}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-sm font-semibold">{text}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, data, dataKey, color }: { title: string; data: any[]; dataKey: string; color: string }) {
  const avg = data.length ? (data.reduce((s, d) => s + d[dataKey], 0) / data.length).toFixed(1) : "—";
  return (
    <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
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
