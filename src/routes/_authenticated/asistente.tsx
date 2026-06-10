import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { askAssistant } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/asistente")({
  component: AsistentePage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "¿Cómo reduzco la hinchazón abdominal?",
  "¿Por qué me despierto entre las 2 y 4 AM?",
  "¿Qué alimentos ayudan en la menopausia?",
  "Estoy muy cansada, ¿qué puedo hacer?",
];

function AsistentePage() {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Msg[]>([{
    role: "assistant",
    content: "¡Hola! Soy tu asistente de bienestar. Puedes preguntarme sobre inflamación, fatiga, sueño y menopausia. Recuerda: mis sugerencias no reemplazan el consejo médico profesional.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const conversation = next.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0);
      const { reply } = await ask({ data: { messages: conversation } });
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de la asistente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <header className="pb-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Acompañamiento IA</p>
        <h1 className="mt-1 text-3xl font-semibold">Asistente</h1>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-card/50 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-secondary px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted">
              <Sparkles className="mr-1 inline h-3 w-3" />{s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={loading}
          className="rounded-full"
        />
        <Button type="submit" disabled={loading || !input.trim()} size="icon" className="h-10 w-10 shrink-0 rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
