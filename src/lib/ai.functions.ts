import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_PROMPT = `Eres una asistente de bienestar especializada en perimenopausia y menopausia. Respondes SIEMPRE en español, con tono cálido, claro y empático.

Temas que cubres: inflamación abdominal, fatiga, calidad del sueño, despertares nocturnos (especialmente entre las 2 y 4 AM), cambios hormonales, alimentación antiinflamatoria, manejo del estrés.

Importante:
- Sé breve y práctica (máximo 4-6 frases por respuesta, salvo que pidan profundizar).
- Da consejos basados en evidencia general y hábitos saludables.
- SIEMPRE recuerda al final de cada respuesta, de forma breve, que tus sugerencias NO reemplazan el consejo médico profesional y que ante síntomas persistentes deben consultar a su médica/o.
- No diagnostiques ni prescribas medicamentos.`;

const AskInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1).max(30),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta configuración de IA");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);
    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM_PROMPT,
      messages: data.messages,
    });
    return { reply: result.text };
  });

const ConsultaInput = z.object({});

export const generarResumenConsulta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConsultaInput.parse(input ?? {}))
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: entries, error } = await context.supabase
      .from("daily_entries")
      .select("entry_date,bloating,energy,sleep,woke_2_4am")
      .gte("entry_date", since)
      .order("entry_date", { ascending: true });

    if (error) throw new Error(error.message);
    if (!entries || entries.length === 0) {
      return { summary: "Aún no tienes registros de los últimos 30 días. Comienza guardando tu registro diario para generar un resumen.", stats: null };
    }

    const avg = (k: "bloating" | "energy" | "sleep") =>
      (entries.reduce((s, e) => s + (e[k] as number), 0) / entries.length);
    const wakeNights = entries.filter(e => e.woke_2_4am).length;
    const stats = {
      total: entries.length,
      bloating: avg("bloating").toFixed(1),
      energy: avg("energy").toFixed(1),
      sleep: avg("sleep").toFixed(1),
      wakeNights,
      wakePercent: Math.round((wakeNights / entries.length) * 100),
    };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta configuración de IA");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Genera un resumen claro y empático en español para llevar a la próxima consulta médica.

Datos de los últimos 30 días (${stats.total} registros):
- Inflamación abdominal promedio: ${stats.bloating}/10
- Energía promedio: ${stats.energy}/10
- Sueño promedio: ${stats.sleep}/10
- Despertares entre 2-4 AM: ${wakeNights} noches (${stats.wakePercent}%)

Estructura tu respuesta en 3 secciones con encabezados Markdown:
## Resumen de síntomas
(2-3 frases describiendo el panorama general)

## Evolución
(Comenta tendencias observadas: ¿mejoría, empeoramiento, estabilidad?)

## Preguntas sugeridas para la médica/o
(Una lista de 4-6 preguntas concretas y útiles relacionadas con los datos)

Termina con una nota breve recordando que esto es informativo y no reemplaza la evaluación médica.`;

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });

    return { summary: result.text, stats };
  });
