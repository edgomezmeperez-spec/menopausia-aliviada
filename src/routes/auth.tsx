import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flower2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Acceder — Menopausia Sin Hinchazón" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/inicio" },
        });
        if (error) throw error;
        toast.success("¡Bienvenida! Revisa tu correo si te lo pedimos.");
        navigate({ to: "/inicio", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/inicio", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/inicio",
    });
    if (result.error) {
      toast.error("No pudimos iniciar sesión con Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/inicio", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--gradient-warm)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <Flower2 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Menopausia Sin Hinchazón</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tu compañera diaria de bienestar</p>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-5 flex gap-2 rounded-full bg-muted p-1">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >Iniciar sesión</button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >Crear cuenta</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full">
              {loading ? "Procesando..." : mode === "signup" ? "Crear cuenta" : "Entrar"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading} className="w-full rounded-full">
            Continuar con Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Al continuar aceptas nuestro cuidado de datos personales.
        </p>
      </div>
    </div>
  );
}
