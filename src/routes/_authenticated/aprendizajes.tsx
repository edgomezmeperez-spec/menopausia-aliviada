import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, RefreshCw, X, Heart, Moon, Zap, Wind, Apple, Target, ThumbsUp, ThumbsDown, Activity } from "lucide-react";
import { obtenerAprendizajes, extraerMemorias, desactivarMemoria } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/aprendizajes")({
  component: AprendizajesPage,
});

type Memory = {
  id: string;
  category: string;
  content: string;
  confidence: number;
  source: string;
  evidence: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  sintomas_predominantes: { label: "Tus síntomas predominantes", icon: Activity, color: "oklch(0.65 0.15 10)" },
  mejoran_energia: { label: "Lo que mejora tu energía", icon: Zap, color: "oklch(0.72 0.14 60)" },
  reducen_inflamacion: { label: "Lo que reduce tu inflamación", icon: Wind, color: "oklch(0.65 0.15 10)" },
  empeoran_sueno: { label: "Lo que empeora tu sueño", icon: Moon, color: "oklch(0.55 0.14 280)" },
  preferencias_alimentarias: { label: "Tus preferencias alimentarias", icon: Apple, color: "oklch(0.65 0.14 140)" },
  objetivos_personales: { label: "Tus objetivos personales", icon: Target, color: "oklch(0.65 0.16 320)" },
  recomendaciones_efectivas: { label: "Recomendaciones que te funcionaron", icon: ThumbsUp, color: "oklch(0.6 0.16 160)" },
  recomendaciones_no_efectivas: { label: "Recomendaciones que no funcionaron", icon: ThumbsDown, color: "oklch(0.6 0.08 30)" },
  patrones_observados: { label: "Patrones observados en ti", icon: Sparkles, color: "oklch(0.6 0.16 290)" },
  otro: { label: "Otros aprendizajes", icon: Heart, color: "oklch(0.65 0.14 340)" },
};

function AprendizajesPage() {
  const obtener = useServerFn(obtenerAprendizajes);
  const extraer = useServerFn(extraerMemorias);
  const desactivar = useServerFn(desactivarMemoria);

  const [data, setData] = useState<{ memories: Memory[]; grouped: Record<string, Memory[]>; total: number; totalEntries: number; minRequired: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);

  async function refresh() {
    try {
      const res = await obtener({ data: {} });
      setData(res as any);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleExtract() {
    setExtracting(true);
    try {
      const res = await extraer({ data: {} });
      toast.success(res.message ?? "Memorias actualizadas");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo actualizar la memoria");
    } finally {
      setExtracting(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await desactivar({ data: { id } });
      setData(d => d ? { ...d, memories: d.memories.filter(m => m.id !== id), grouped: Object.fromEntries(Object.entries(d.grouped).map(([k, v]) => [k, v.filter(m => m.id !== id)])) } : d);
    } catch (e: any) {
      toast.error("No se pudo eliminar");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 pb-32 pt-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Brain className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Memoria personalizada</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Lo que hemos aprendido sobre ti</h1>
        <p className="text-sm text-muted-foreground">
          Estos son los aprendizajes que la IA ha ido reuniendo a partir de tus registros, conversaciones, adherencia al plan y los resultados que has reportado. Cuanto más uses la app, mejor te conocerá.
        </p>
      </header>

      <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-start justify-between gap-3 text-primary-foreground">
          <div>
            <p className="text-[11px] uppercase tracking-wider opacity-80">Aprendizajes activos</p>
            <p className="font-display text-4xl font-semibold">{data?.total ?? 0}</p>
            <p className="mt-1 text-xs opacity-90">Basados en {data?.totalEntries ?? 0} registros recientes</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExtract}
            disabled={extracting}
            className="rounded-full"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${extracting ? "animate-spin" : ""}`} />
            {extracting ? "Analizando" : "Volver a aprender"}
          </Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Cargando aprendizajes…</p>
      ) : !data || data.memories.length === 0 ? (
        <Card className="rounded-3xl border-0 p-6 text-center shadow-[var(--shadow-soft)]">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Aún estamos conociéndote</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {data && data.totalEntries < data.minRequired
              ? `Necesitamos al menos ${data.minRequired} registros diarios para empezar a aprender sobre ti. Llevas ${data.totalEntries}.`
              : "Cuando tengamos más datos, aquí aparecerán observaciones simples y útiles sobre lo que parece funcionarte mejor."}
          </p>
          <Button type="button" onClick={handleExtract} disabled={extracting} className="mt-4 rounded-full">
            <Sparkles className="mr-1.5 h-4 w-4" />
            Intentar aprender ahora
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(data.grouped).map(([cat, items]) => {
            const meta = CATEGORY_META[cat] ?? CATEGORY_META.otro;
            const Icon = meta.icon;
            return (
              <Card key={cat} className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `color-mix(in oklab, ${meta.color} 18%, transparent)` }}>
                    <Icon className="h-4 w-4" style={{ color: meta.color }} />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{meta.label}</h3>
                </div>
                <ul className="space-y-2.5">
                  {items.map(m => (
                    <li key={m.id} className="group flex items-start justify-between gap-3 rounded-2xl bg-secondary/40 p-3">
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-foreground">{m.content}</p>
                        {m.evidence && (
                          <p className="mt-1 text-[11px] italic text-muted-foreground">{m.evidence}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Confianza</span>
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                            <div className="h-full" style={{ width: `${m.confidence}%`, background: meta.color }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{m.confidence}%</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(m.id)}
                        aria-label="Descartar aprendizaje"
                        className="opacity-50 transition hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] italic text-muted-foreground">
        Esta memoria es orientativa y de acompañamiento. No reemplaza la valoración médica profesional.
      </p>
    </div>
  );
}
