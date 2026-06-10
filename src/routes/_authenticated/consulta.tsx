import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { generarResumenConsulta } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stethoscope, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/consulta")({
  component: ConsultaPage,
});

function ConsultaPage() {
  const generar = useServerFn(generarResumenConsulta);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await generar({ data: {} });
      setSummary(res.summary);
      setStats(res.stats);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (summary) {
      navigator.clipboard.writeText(summary);
      toast.success("Resumen copiado al portapapeles");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Para tu médica/o</p>
        <h1 className="mt-1 text-3xl font-semibold">Próxima consulta</h1>
      </header>

      <Card className="rounded-2xl border-0 p-5 shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-warm)" }}>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Genera un resumen de los últimos 30 días con tus síntomas, evolución y preguntas sugeridas para tu profesional de salud.</p>
          </div>
        </div>
      </Card>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Inflamación" value={stats.bloating} suffix="/10" />
          <Stat label="Energía" value={stats.energy} suffix="/10" />
          <Stat label="Sueño" value={stats.sleep} suffix="/10" />
          <Stat label="Despertares 2-4 AM" value={`${stats.wakePercent}%`} />
        </div>
      )}

      <Button onClick={run} disabled={loading} className="h-12 w-full rounded-full text-base shadow-[var(--shadow-soft)]">
        <FileText className="mr-2 h-4 w-4" />
        {loading ? "Generando resumen..." : summary ? "Regenerar resumen" : "Generar resumen"}
      </Button>

      {summary && (
        <Card className="rounded-2xl border-0 p-5 shadow-[var(--shadow-soft)]">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {summary}
          </div>
          <Button variant="outline" onClick={copy} className="mt-4 w-full rounded-full">Copiar resumen</Button>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <Card className="rounded-2xl border-0 p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}<span className="text-sm text-muted-foreground">{suffix}</span></p>
    </Card>
  );
}
