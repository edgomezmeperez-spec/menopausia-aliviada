import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_PROMPT = `Eres una asistente de bienestar especializada en perimenopausia y menopausia, enfocada en tres ejes: inflamación abdominal, fatiga y despertares nocturnos entre las 2 y 4 AM. Respondes SIEMPRE en español, con tono cálido, claro y empático, dirigido a mujeres de 40 a 65 años.

Importante:
- Sé breve y práctica (4-6 frases por respuesta, salvo que pidan profundizar).
- Da consejos basados en evidencia general y hábitos saludables.
- SIEMPRE recuerda al final, de forma breve, que tus sugerencias NO reemplazan el consejo médico profesional.
- No diagnostiques ni prescribas medicamentos.`;

const AskInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1).max(30),
});

async function callGateway(opts: { system?: string; prompt?: string; messages?: { role: "user" | "assistant"; content: string }[] }) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Falta configuración de IA");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(key);
  const base: any = { model: gateway("google/gemini-3-flash-preview") };
  if (opts.system) base.system = opts.system;
  if (opts.messages) base.messages = opts.messages;
  else if (opts.prompt) base.prompt = opts.prompt;
  const result = await generateText(base);
  return result.text;
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const reply = await callGateway({ system: SYSTEM_PROMPT, messages: data.messages });
    return { reply };
  });

type Entry = { entry_date: string; bloating: number; energy: number; sleep: number; woke_2_4am: boolean };

function computeStats(entries: Entry[]) {
  if (entries.length === 0) return null;
  const avg = (k: "bloating" | "energy" | "sleep") =>
    entries.reduce((s, e) => s + (e[k] as number), 0) / entries.length;
  const wakeNights = entries.filter(e => e.woke_2_4am).length;
  // trend: compare first half vs second half
  const mid = Math.floor(entries.length / 2);
  const first = entries.slice(0, mid);
  const last = entries.slice(mid);
  const trend = (k: "bloating" | "energy" | "sleep") => {
    if (first.length === 0 || last.length === 0) return 0;
    const a = first.reduce((s, e) => s + e[k], 0) / first.length;
    const b = last.reduce((s, e) => s + e[k], 0) / last.length;
    return +(b - a).toFixed(1);
  };
  // frequent symptoms
  const highBloating = entries.filter(e => e.bloating >= 7).length;
  const lowEnergy = entries.filter(e => e.energy <= 4).length;
  const poorSleep = entries.filter(e => e.sleep <= 4).length;
  const frequent = [
    { key: "bloating", label: "Inflamación abdominal alta (≥7)", count: highBloating, percent: Math.round(highBloating / entries.length * 100) },
    { key: "fatigue", label: "Fatiga intensa (energía ≤4)", count: lowEnergy, percent: Math.round(lowEnergy / entries.length * 100) },
    { key: "wake", label: "Despertares 2-4 AM", count: wakeNights, percent: Math.round(wakeNights / entries.length * 100) },
    { key: "sleep", label: "Sueño deficiente (≤4)", count: poorSleep, percent: Math.round(poorSleep / entries.length * 100) },
  ].sort((a, b) => b.count - a.count);

  return {
    total: entries.length,
    bloating: +avg("bloating").toFixed(1),
    energy: +avg("energy").toFixed(1),
    sleep: +avg("sleep").toFixed(1),
    wakeNights,
    wakePercent: Math.round((wakeNights / entries.length) * 100),
    trendBloating: trend("bloating"),
    trendEnergy: trend("energy"),
    trendSleep: trend("sleep"),
    frequent,
  };
}

async function fetchEntries(supabase: any, days = 30): Promise<Entry[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_entries")
    .select("entry_date,bloating,energy,sleep,woke_2_4am")
    .gte("entry_date", since)
    .order("entry_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Entry[];
}

export const generarInsightsHistorial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ days: z.number().min(7).max(90).default(30) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const entries = await fetchEntries(context.supabase, data.days);
    const stats = computeStats(entries);
    if (!stats) return { insights: "Aún no tienes suficientes registros para detectar patrones. Continúa registrando tus síntomas a diario.", stats: null };

    const prompt = `Analiza los siguientes datos de salud de una mujer en menopausia (últimos ${data.days} días, ${stats.total} registros) y genera insights breves en español.

Promedios:
- Inflamación abdominal: ${stats.bloating}/10 (tendencia: ${stats.trendBloating > 0 ? "+" : ""}${stats.trendBloating})
- Energía: ${stats.energy}/10 (tendencia: ${stats.trendEnergy > 0 ? "+" : ""}${stats.trendEnergy})
- Sueño: ${stats.sleep}/10 (tendencia: ${stats.trendSleep > 0 ? "+" : ""}${stats.trendSleep})
- Despertares 2-4 AM: ${stats.wakePercent}% de las noches

Responde en Markdown con esta estructura exacta, sin introducción:

## 📈 Tendencias detectadas
(2-3 frases describiendo si los síntomas mejoran, empeoran o se mantienen)

## 🔍 Patrón principal
(1 patrón relevante entre sueño, energía e inflamación, en 2-3 frases)

## 💡 Recomendación de la semana
(1 acción concreta y realizable, en 2 frases)

Cierra con: "Recuerda: esta es información orientativa, no reemplaza la valoración médica."`;

    const insights = await callGateway({ prompt });
    return { insights, stats };
  });

export const generarResumenConsulta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async ({ context }) => {
    const entries = await fetchEntries(context.supabase, 30);
    const stats = computeStats(entries);
    if (!stats) {
      return { summary: "Aún no tienes registros de los últimos 30 días. Comienza guardando tu registro diario para generar un resumen.", stats: null, questions: [] };
    }

    const prompt = `Genera un resumen profesional y empático en español para llevar a la próxima consulta médica de una mujer en menopausia.

Datos de los últimos 30 días (${stats.total} registros):
- Inflamación abdominal promedio: ${stats.bloating}/10 (tendencia ${stats.trendBloating > 0 ? "+" : ""}${stats.trendBloating})
- Energía promedio: ${stats.energy}/10 (tendencia ${stats.trendEnergy > 0 ? "+" : ""}${stats.trendEnergy})
- Sueño promedio: ${stats.sleep}/10 (tendencia ${stats.trendSleep > 0 ? "+" : ""}${stats.trendSleep})
- Despertares entre 2-4 AM: ${stats.wakeNights} noches (${stats.wakePercent}%)
- Síntomas más frecuentes: ${stats.frequent.slice(0, 3).map(f => `${f.label} ${f.percent}%`).join(", ")}

Estructura tu respuesta en Markdown:

## Resumen de síntomas
(3-4 frases describiendo el panorama general y los síntomas más relevantes)

## Evolución en 30 días
(Comenta tendencias observadas con base en los datos)

## Preguntas sugeridas para la médica/o
(Lista numerada de 6 preguntas concretas y específicas basadas en los datos)

Termina con una nota breve recordando que esto es informativo y no reemplaza la evaluación médica.`;

    const summary = await callGateway({ prompt });

    // Extract questions list
    const questions: string[] = [];
    const qSection = summary.split(/##\s*Preguntas/i)[1] ?? "";
    qSection.split("\n").forEach(line => {
      const m = line.match(/^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/);
      if (m) questions.push(m[1]);
    });

    return { summary, stats, questions };
  });
