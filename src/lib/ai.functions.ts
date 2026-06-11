import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MIN_RECORDS_FOR_PATTERNS = 7;

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

async function callGatewayJSON<T = any>(prompt: string, system?: string): Promise<T> {
  const raw = await callGateway({ prompt, system });
  // Strip code fences if present
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // Find first { and last }
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Respuesta IA no contiene JSON válido");
  return JSON.parse(clean.slice(start, end + 1));
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const reply = await callGateway({ system: SYSTEM_PROMPT, messages: data.messages });
    return { reply };
  });

type Entry = { entry_date: string; bloating: number; energy: number; sleep: number; woke_2_4am: boolean };
type Recommendation = { id: string; content: string; category: string; source: string; for_date: string; created_at: string };
type Followup = { recommendation_id: string; followed: "si" | "parcial" | "no"; feeling: string | null; created_at: string };

function computeStats(entries: Entry[]) {
  if (entries.length === 0) return null;
  const avg = (k: "bloating" | "energy" | "sleep") =>
    entries.reduce((s, e) => s + (e[k] as number), 0) / entries.length;
  const wakeNights = entries.filter(e => e.woke_2_4am).length;
  const mid = Math.floor(entries.length / 2);
  const first = entries.slice(0, mid);
  const last = entries.slice(mid);
  const trend = (k: "bloating" | "energy" | "sleep") => {
    if (first.length === 0 || last.length === 0) return 0;
    const a = first.reduce((s, e) => s + e[k], 0) / first.length;
    const b = last.reduce((s, e) => s + e[k], 0) / last.length;
    return +(b - a).toFixed(1);
  };
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

async function fetchRecommendations(supabase: any, days = 60): Promise<Recommendation[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("recommendations")
    .select("id,content,category,source,for_date,created_at")
    .gte("for_date", since)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Recommendation[];
}

async function fetchFollowups(supabase: any, recIds: string[]): Promise<Followup[]> {
  if (recIds.length === 0) return [];
  const { data, error } = await supabase
    .from("recommendation_followups")
    .select("recommendation_id,followed,feeling,created_at")
    .in("recommendation_id", recIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as Followup[];
}

function computeAdherence(recs: Recommendation[], followups: Followup[]) {
  const fByRec = new Map(followups.map(f => [f.recommendation_id, f]));
  const total = recs.length;
  const answered = recs.filter(r => fByRec.has(r.id));
  const score = answered.reduce((s, r) => {
    const f = fByRec.get(r.id);
    if (!f) return s;
    if (f.followed === "si") return s + 1;
    if (f.followed === "parcial") return s + 0.5;
    return s;
  }, 0);
  const adherencePercent = answered.length ? Math.round((score / answered.length) * 100) : 0;
  const responseRate = total ? Math.round((answered.length / total) * 100) : 0;

  // Weekly buckets (last 4 weeks)
  const now = new Date();
  const weekly: { label: string; percent: number; count: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const start = new Date(now); start.setDate(now.getDate() - (w + 1) * 7);
    const end = new Date(now); end.setDate(now.getDate() - w * 7);
    const weekRecs = recs.filter(r => {
      const d = new Date(r.for_date);
      return d >= start && d < end;
    });
    const weekAnswered = weekRecs.filter(r => fByRec.has(r.id));
    const weekScore = weekAnswered.reduce((s, r) => {
      const f = fByRec.get(r.id);
      if (!f) return s;
      if (f.followed === "si") return s + 1;
      if (f.followed === "parcial") return s + 0.5;
      return s;
    }, 0);
    weekly.push({
      label: `Sem ${4 - w}`,
      percent: weekAnswered.length ? Math.round((weekScore / weekAnswered.length) * 100) : 0,
      count: weekRecs.length,
    });
  }

  return { adherencePercent, responseRate, total, answered: answered.length, weekly };
}

export const generarInsightsHistorial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ days: z.number().min(7).max(90).default(30) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const entries = await fetchEntries(context.supabase, data.days);
    const stats = computeStats(entries);

    if (!stats || stats.total < MIN_RECORDS_FOR_PATTERNS) {
      return {
        insights: `## 🌱 Aún estamos conociéndote\n\nNecesitamos más información para detectar patrones confiables. Continúa registrando tus síntomas diariamente y volveremos a analizar tus tendencias cuando tengamos suficientes datos.\n\n*Llevas ${stats?.total ?? 0} de ${MIN_RECORDS_FOR_PATTERNS} registros necesarios.*`,
        stats,
        insufficient: true,
      };
    }

    // Adherence context
    const recs = await fetchRecommendations(context.supabase, data.days);
    const followups = await fetchFollowups(context.supabase, recs.map(r => r.id));
    const adherence = computeAdherence(recs, followups);

    const adherenceBlock = recs.length > 0
      ? `\n\nAdherencia al plan:\n- Recomendaciones recibidas: ${adherence.total}\n- Respondidas: ${adherence.answered}\n- % adherencia: ${adherence.adherencePercent}%`
      : "";

    const prompt = `Analiza los datos de salud de una mujer en menopausia (últimos ${data.days} días, ${stats.total} registros) y genera insights breves en español, con tono empático y de acompañamiento. EVITA afirmaciones contundentes; usa expresiones como "parece haber", "podría sugerir", "se observa una tendencia".

Datos:
- Inflamación abdominal: ${stats.bloating}/10 (tendencia: ${stats.trendBloating > 0 ? "+" : ""}${stats.trendBloating})
- Energía: ${stats.energy}/10 (tendencia: ${stats.trendEnergy > 0 ? "+" : ""}${stats.trendEnergy})
- Sueño: ${stats.sleep}/10 (tendencia: ${stats.trendSleep > 0 ? "+" : ""}${stats.trendSleep})
- Despertares 2-4 AM: ${stats.wakePercent}% de las noches${adherenceBlock}

Responde en Markdown con esta estructura exacta, sin introducción:

## 📈 Tendencias detectadas
(2-3 frases describiendo evolución)

## 🔍 Correlaciones y patrones
(1-2 correlaciones entre sueño, energía, inflamación y despertares)

${recs.length > 0 ? `## 🤝 Adherencia y bienestar
(Comenta si las semanas con mayor adherencia coinciden con mejor energía/sueño/menor inflamación)\n\n` : ""}## 💡 Recomendaciones personalizadas
(2-3 acciones concretas adaptadas a tus datos)

Cierra con: "Recuerda: esta es información orientativa de acompañamiento, no reemplaza la valoración médica profesional."`;

    const insights = await callGateway({ prompt });
    return { insights, stats, adherence, insufficient: false };
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
## Evolución en 30 días
## Preguntas sugeridas para la médica/o
(Lista numerada de 6 preguntas concretas)

Termina con una nota breve recordando que esto es informativo y no reemplaza la evaluación médica.`;

    const summary = await callGateway({ prompt });

    const questions: string[] = [];
    const qSection = summary.split(/##\s*Preguntas/i)[1] ?? "";
    qSection.split("\n").forEach(line => {
      const m = line.match(/^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/);
      if (m) questions.push(m[1]);
    });

    return { summary, stats, questions };
  });

/* ====================== Consejo de hoy ====================== */

export const generarConsejoHoy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ force: z.boolean().default(false) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const today = new Date().toISOString().slice(0, 10);

    // Check if a consejo already exists for today
    const { data: existing } = await context.supabase
      .from("recommendations")
      .select("id,content,category,source,for_date,created_at")
      .eq("source", "consejo_hoy")
      .eq("for_date", today)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0 && !data.force) {
      return { recommendation: existing[0] as Recommendation, reused: true };
    }

    const entries = await fetchEntries(context.supabase, 14);
    const stats = computeStats(entries);

    const context_text = stats
      ? `Datos recientes (${stats.total} días): inflamación ${stats.bloating}/10, energía ${stats.energy}/10, sueño ${stats.sleep}/10, despertares 2-4 AM ${stats.wakePercent}%.`
      : "Aún no hay datos suficientes. Genera un consejo general suave de bienestar.";

    const prompt = `${context_text}

Genera UN único consejo personalizado del día para una mujer en menopausia (40-65 años). Debe ser concreto, accionable hoy mismo, cálido y breve (máx. 2 frases). Puede ser un hábito, alimento, bebida, batido, ejercicio o pauta de sueño.

Responde SOLO con JSON válido (sin markdown):
{
  "category": "habito" | "alimento" | "bebida" | "batido" | "ejercicio" | "sueno" | "respiracion" | "consejo",
  "content": "El consejo en 1-2 frases, en segunda persona singular (tú)."
}`;

    const parsed = await callGatewayJSON<{ category: string; content: string }>(prompt);
    const allowedCats = ["habito", "alimento", "bebida", "batido", "ejercicio", "sueno", "respiracion", "consejo"];
    const category = allowedCats.includes(parsed.category) ? parsed.category : "consejo";

    const { data: inserted, error } = await context.supabase
      .from("recommendations")
      .insert({
        user_id: context.userId,
        content: parsed.content,
        category,
        source: "consejo_hoy",
        for_date: today,
      })
      .select("id,content,category,source,for_date,created_at")
      .single();
    if (error) throw new Error(error.message);

    return { recommendation: inserted as Recommendation, reused: false };
  });

/* ====================== Seguimiento de recomendaciones ====================== */

export const obtenerSeguimientoPendiente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async ({ context }) => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const { data: yRecs } = await context.supabase
      .from("recommendations")
      .select("id,content,category,source,for_date,created_at")
      .eq("source", "consejo_hoy")
      .eq("for_date", yesterday)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!yRecs || yRecs.length === 0) return { pending: null, lastFollowup: null };

    const rec = yRecs[0] as Recommendation;

    const { data: existingFollowup } = await context.supabase
      .from("recommendation_followups")
      .select("recommendation_id,followed,feeling,created_at")
      .eq("recommendation_id", rec.id)
      .limit(1);

    if (existingFollowup && existingFollowup.length > 0) {
      return { pending: null, lastFollowup: { recommendation: rec, followup: existingFollowup[0] as Followup } };
    }

    return { pending: rec, lastFollowup: null };
  });

export const responderSeguimiento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    recommendationId: z.string().uuid(),
    followed: z.enum(["si", "parcial", "no"]),
    feeling: z.enum(["mucho_mejor", "algo_mejor", "igual", "peor"]).nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("recommendation_followups")
      .upsert({
        user_id: context.userId,
        recommendation_id: data.recommendationId,
        followed: data.followed,
        feeling: data.feeling ?? null,
      }, { onConflict: "recommendation_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ====================== Plan de acción ====================== */

export const generarPlanAccion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async ({ context }) => {
    const entries = await fetchEntries(context.supabase, 30);
    const stats = computeStats(entries);

    const today = new Date().toISOString().slice(0, 10);

    const ctx = stats
      ? `Promedios últimos ${stats.total} días: inflamación ${stats.bloating}/10, energía ${stats.energy}/10, sueño ${stats.sleep}/10, despertares 2-4 AM ${stats.wakePercent}%.`
      : "Sin datos suficientes. Genera un plan general de bienestar suave.";

    const prompt = `${ctx}

Genera un plan de acción semanal personalizado para una mujer en menopausia enfocado en inflamación abdominal, fatiga y despertares 2-4 AM. Tono cálido, no clínico, orientación general.

Responde SOLO con JSON válido (sin markdown):
{
  "objetivos_semanales": ["3 objetivos concretos y alcanzables en 7 días"],
  "habitos_diarios": ["5 hábitos cortos para hacer cada día"],
  "tips_sueno": ["3 consejos para mejorar el sueño y reducir despertares 2-4 AM"],
  "tips_energia": ["3 consejos para mejorar la energía y reducir fatiga"],
  "tips_inflamacion": ["3 consejos de alimentación/hábitos para reducir inflamación abdominal"]
}

Cada elemento debe ser una sola frase clara y accionable, en segunda persona singular (tú).`;

    type Plan = {
      objetivos_semanales: string[];
      habitos_diarios: string[];
      tips_sueno: string[];
      tips_energia: string[];
      tips_inflamacion: string[];
    };
    const plan = await callGatewayJSON<Plan>(prompt);

    // Persist as recommendations (source = 'plan')
    const allItems: { content: string; category: string }[] = [
      ...(plan.objetivos_semanales ?? []).map(c => ({ content: c, category: "objetivo" })),
      ...(plan.habitos_diarios ?? []).map(c => ({ content: c, category: "habito" })),
      ...(plan.tips_sueno ?? []).map(c => ({ content: c, category: "sueno" })),
      ...(plan.tips_energia ?? []).map(c => ({ content: c, category: "energia" })),
      ...(plan.tips_inflamacion ?? []).map(c => ({ content: c, category: "inflamacion" })),
    ];

    if (allItems.length > 0) {
      const rows = allItems.map(i => ({
        user_id: context.userId,
        content: i.content,
        category: i.category,
        source: "plan",
        for_date: today,
      }));
      await context.supabase.from("recommendations").insert(rows);
    }

    return { plan, stats };
  });

export const obtenerDatosPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async ({ context }) => {
    const recs = await fetchRecommendations(context.supabase, 60);
    const followups = await fetchFollowups(context.supabase, recs.map(r => r.id));
    const adherence = computeAdherence(recs, followups);

    // Latest plan items grouped
    const planRecs = recs.filter(r => r.source === "plan");
    const latestDate = planRecs[0]?.for_date ?? null;
    const latestPlanItems = latestDate ? planRecs.filter(r => r.for_date === latestDate) : [];

    const grouped: Record<string, Recommendation[]> = {};
    latestPlanItems.forEach(r => {
      grouped[r.category] = grouped[r.category] ?? [];
      grouped[r.category].push(r);
    });

    return { adherence, latestPlanDate: latestDate, planByCategory: grouped, recentRecommendations: recs.slice(0, 10), followups };
  });
