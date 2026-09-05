import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { generarResumenConsulta } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stethoscope, FileText, Download, HelpCircle, AlertCircle } from "lucide-react";
import { AppointmentsSection } from "@/components/AppointmentsSection";
import jsPDF from "jspdf";


export const Route = createFileRoute("/_authenticated/consulta")({
  component: ConsultaPage,
});

type Stats = {
  total: number;
  bloating: number;
  energy: number;
  sleep: number;
  wakeNights: number;
  wakePercent: number;
  trendBloating: number;
  trendEnergy: number;
  trendSleep: number;
  frequent: { key: string; label: string; count: number; percent: number }[];
};

function ConsultaPage() {
  const generar = useServerFn(generarResumenConsulta);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);

  async function run() {
    setLoading(true);
    try {
      const res = await generar({ data: {} });
      setSummary(res.summary);
      setStats(res.stats as Stats | null);
      setQuestions(res.questions ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function exportPDF() {
    if (!summary) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Resumen de salud · Menopausia Sin Hinchazón", margin, y);
    y += 24;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(`Generado el ${new Date().toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}`, margin, y);
    y += 24;

    if (stats) {
      doc.setTextColor(40);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Datos clave (últimos 30 días)", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      const lines = [
        `• Registros completados: ${stats.total}`,
        `• Inflamación abdominal promedio: ${stats.bloating}/10`,
        `• Energía promedio: ${stats.energy}/10`,
        `• Calidad del sueño promedio: ${stats.sleep}/10`,
        `• Despertares 2-4 AM: ${stats.wakeNights} noches (${stats.wakePercent}%)`,
      ];
      lines.forEach(l => { doc.text(l, margin, y); y += 14; });
      y += 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Resumen", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Strip markdown headers and bullets for clean PDF
    const clean = summary
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^\s*[-*]\s+/gm, "• ");
    const wrapped = doc.splitTextToSize(clean, width);
    wrapped.forEach((line: string) => {
      if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 13;
    });

    y += 10;
    if (y > doc.internal.pageSize.getHeight() - margin - 30) { doc.addPage(); y = margin; }
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Este documento es informativo y no reemplaza la evaluación médica profesional.", margin, y);

    doc.save(`resumen-consulta-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF descargado");
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
        <h1 className="mt-1 font-display text-3xl font-semibold">Próxima consulta</h1>
      </header>

      <AppointmentsSection />

      <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-warm)" }}>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Genera un resumen profesional con tus datos de los últimos 30 días, preguntas sugeridas y exporta el PDF para llevar a tu consulta.</p>
          </div>
        </div>
      </Card>


      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Inflamación" value={stats.bloating} suffix="/10" />
            <Stat label="Energía" value={stats.energy} suffix="/10" />
            <Stat label="Sueño" value={stats.sleep} suffix="/10" />
            <Stat label="Despertares 2-4 AM" value={`${stats.wakePercent}%`} />
          </div>

          {/* Síntomas más frecuentes */}
          <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Síntomas más frecuentes</p>
            </div>
            <div className="space-y-2.5">
              {stats.frequent.filter(f => f.count > 0).slice(0, 4).map(f => (
                <div key={f.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-foreground">{f.label}</span>
                    <span className="font-semibold text-muted-foreground">{f.count} días · {f.percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${f.percent}%` }} />
                  </div>
                </div>
              ))}
              {stats.frequent.every(f => f.count === 0) && (
                <p className="text-xs text-muted-foreground">¡No has registrado síntomas intensos en este período!</p>
              )}
            </div>
          </Card>
        </>
      )}

      <Button onClick={run} disabled={loading} className="h-12 w-full rounded-full text-base shadow-[var(--shadow-soft)]">
        <FileText className="mr-2 h-4 w-4" />
        {loading ? "Generando resumen..." : summary ? "Regenerar resumen" : "Generar resumen con IA"}
      </Button>

      {summary && (
        <>
          {questions.length > 0 && (
            <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Preguntas para tu médica/o</p>
              </div>
              <ol className="space-y-2.5 text-sm leading-relaxed text-foreground">
                {questions.map((q, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{i + 1}</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <Card className="rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
            <p className="mb-3 text-sm font-semibold">Resumen completo</p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {summary}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={exportPDF} className="h-11 rounded-full">
              <Download className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
            <Button variant="outline" onClick={copy} className="h-11 rounded-full">Copiar texto</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <Card className="rounded-3xl border-0 p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-primary">{value}<span className="text-sm text-muted-foreground">{suffix}</span></p>
    </Card>
  );
}
