import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { obtenerDatosPlan, generarPlanAccion } from "@/lib/ai.functions";
import { Target, Sparkles, Moon, Zap, Wind, CheckCircle2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plan")({
  component: PlanPage,
});

type Recommendation = { id: string; content: string; category: string; source: string; for_date: string; created_at: string };
type PlanData = {
  adherence: {
    adherencePercent: number;
    responseRate: number;
    total: number;
    answered: number;
    weekly: { label: string; percent: number; count: number }[];
  };
  latestPlanDate: string | null;
  planByCategory: Record<string, Recommendation[]>;
};

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  objetivo: { label: "Objetivos semanales", icon: Target, color: "oklch(0.65 0.16 320)" },
  habito: { label: "Hábitos diarios", icon: CheckCircle2, color: "oklch(0.65 0.14 160)" },
  sueno: { label: "Para tu sueño", icon: Moon, color: "oklch(0.65 0.13 280)" },
  energia: { label: "Para tu energía", icon: Zap, color: "oklch(0.72 0.14 60)" },
  inflamacion: { label: "Para reducir inflamación", icon: Wind, color: "oklch(0.65 0.15 10)" },
};

function PlanPage() {
  const obtener = useServerFn(obtenerDatosPlan);
  const generar = useServerFn(generarPlanAccion);
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function refresh() {
    try {
      const res = await obtener({ data: {} });
      setData(res as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function generate() {
    setGenerating(true);
    try {
      await generar({ data: {} });
      toast.success("Plan generado ✨");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generando plan");
    } finally {
      setGenerating(false);
    }
  }

  const hasPlan = data?.latestPlanDate && Object.keys(data.planByCategory).length > 0;
  const adh = data?.adherence;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Tu acompañamiento</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Mi Plan de Acción</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recomendaciones personalizadas para tu bienestar.</p>
      </header>

      {/* Adherencia */}
      {adh && adh.total > 0 && (
        <Card className="overflow-hidden rounded-3xl border-0 p-6 text-white shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Adherencia al plan</p>
              <p className="mt-1 font-display text-4xl font-semibold">{adh.adherencePercent}%</p>
              <p className="mt-1 text-xs opacity-90">{adh.answered} de {adh.total} recomendaciones respondidas</p>
            </div>
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="3" strokeDasharray={`${adh.adherencePercent}, 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{adh.adherencePercent}%</span>
            </div>
          </div>
        </Card>
      )}

      {/* Evolución semanal */}
      {adh && adh.weekly.some(w => w.count > 0) && (
        <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Evolución semanal</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {adh.weekly.map((w, i) => (
              <div key={i} className="rounded-2xl bg-muted/50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{w.label}</p>
                <p className="mt-1 font-display text-lg font-semibold text-primary">{w.percent}%</p>
                <p className="text-[10px] text-muted-foreground">{w.count} rec.</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Plan content */}
      {loading ? (
        <Card className="rounded-3xl border-0 p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </Card>
      ) : hasPlan ? (
        <>
          <p className="text-xs text-muted-foreground">
            Plan generado el {new Date(data!.latestPlanDate!).toLocaleDateString("es", { day: "numeric", month: "long" })}
          </p>
          {Object.entries(data!.planByCategory)
            .sort(([a], [b]) => {
              const order = ["objetivo", "habito", "sueno", "energia", "inflamacion"];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([cat, items]) => {
              const meta = CATEGORY_META[cat] ?? { label: cat, icon: Sparkles, color: "var(--primary)" };
              const Icon = meta.icon;
              return (
                <Card key={cat} className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${meta.color} 18%, transparent)` }}>
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                    </div>
                    <p className="text-sm font-semibold">{meta.label}</p>
                  </div>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-foreground">
                    {items.map(it => (
                      <li key={it.id} className="flex gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                        <span>{it.content}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
        </>
      ) : (
        <Card className="rounded-3xl border-0 p-6 text-center shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-warm)" }}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Aún no tienes un plan personalizado</p>
          <p className="mt-1 text-xs text-muted-foreground">Genera tu primer plan basado en tus registros recientes.</p>
        </Card>
      )}

      <Button onClick={generate} disabled={generating} className="h-12 w-full rounded-full text-base shadow-[var(--shadow-soft)]">
        <Sparkles className="mr-2 h-4 w-4" />
        {generating ? "Generando tu plan..." : hasPlan ? "Generar plan nuevo" : "Generar mi plan con IA"}
      </Button>

      <p className="px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        Estas sugerencias son orientación general de bienestar y acompañamiento. No reemplazan la atención médica profesional.
      </p>
    </div>
  );
}
