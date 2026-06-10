import { Link } from "@tanstack/react-router";
import { Home, LineChart, Sparkles, Stethoscope, BookOpen } from "lucide-react";

const items = [
  { to: "/inicio", label: "Inicio", icon: Home },
  { to: "/historial", label: "Historial", icon: LineChart },
  { to: "/asistente", label: "Asistente", icon: Sparkles },
  { to: "/consulta", label: "Consulta", icon: Stethoscope },
  { to: "/biblioteca", label: "Biblioteca", icon: BookOpen },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
