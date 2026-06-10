import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  component: BibliotecaPage,
});

type Article = { title: string; body: string };
type Category = { key: string; emoji: string; name: string; description: string; articles: Article[] };

const CATEGORIES: Category[] = [
  {
    key: "inflamacion", emoji: "🌸", name: "Inflamación abdominal",
    description: "Cómo entender y aliviar la hinchazón.",
    articles: [
      { title: "Por qué aparece la hinchazón en la menopausia",
        body: "Los cambios en estrógeno y progesterona alteran la retención de líquidos, el ritmo intestinal y la microbiota. Comer despacio, masticar bien y reducir alimentos ultraprocesados ayuda en los primeros días." },
      { title: "Alimentos que suelen aliviar",
        body: "Hinojo, jengibre, menta, papaya, kéfir y verduras cocidas. Limita gaseosas, edulcorantes (sorbitol, manitol) y harinas refinadas durante 2-4 semanas y observa cambios." },
      { title: "Rutina antiinflamatoria de 10 minutos",
        body: "Caminar después de comer, respiración diafragmática (4-7-8) y un masaje abdominal en sentido horario reducen la sensación de presión." },
    ],
  },
  {
    key: "fatiga", emoji: "⚡", name: "Fatiga",
    description: "Estrategias para recuperar energía.",
    articles: [
      { title: "El sueño profundo es tu mejor energizante",
        body: "La fatiga suele venir de despertares nocturnos invisibles. Antes de cambiar la dieta, cuida el sueño: oscuridad, frescor y horarios estables." },
      { title: "Mover el cuerpo, sin agotarlo",
        body: "30 minutos diarios de caminata + 2 sesiones semanales de fuerza ligera mejoran energía y composición corporal en la menopausia." },
      { title: "Hierro, B12 y vitamina D",
        body: "Pídele a tu médica/o que revise estos valores si llevas semanas con cansancio que no cede." },
    ],
  },
  {
    key: "sueno", emoji: "🌙", name: "Sueño",
    description: "Higiene del sueño en menopausia.",
    articles: [
      { title: "Rutina nocturna en 3 pasos",
        body: "1) Cena ligera 3h antes. 2) Pantallas fuera de la habitación. 3) Temperatura entre 18-20°C." },
      { title: "Sofocos nocturnos: qué hacer",
        body: "Pijamas de algodón o bambú, sábanas en capas, ventilador suave. Evita alcohol y comidas picantes en la noche." },
    ],
  },
  {
    key: "despertares", emoji: "🕑", name: "Despertares nocturnos",
    description: "Por qué te despiertas entre 2 y 4 AM.",
    articles: [
      { title: "El pico de cortisol nocturno",
        body: "En perimenopausia, el cortisol puede subir de madrugada y romper el sueño. Reducir estrés diurno y cuidar la cena (proteína + carbohidrato complejo) suele ayudar." },
      { title: "¿Qué hacer si te despiertas?",
        body: "No mires el reloj. Respira lento (inhala 4s, exhala 6s) durante 5 minutos. Si pasados 20 minutos sigues despierta, levántate a un espacio en penumbra hasta sentir sueño." },
    ],
  },
  {
    key: "menopausia", emoji: "🌺", name: "Menopausia",
    description: "Lo esencial de esta etapa.",
    articles: [
      { title: "Perimenopausia vs menopausia",
        body: "La perimenopausia puede durar 4-10 años con ciclos irregulares y síntomas fluctuantes. La menopausia se confirma tras 12 meses sin menstruación." },
      { title: "Cuándo consultar",
        body: "Síntomas que afecten tu calidad de vida, sangrados anormales, dolor persistente o ánimo bajo merecen una consulta especializada." },
    ],
  },
  {
    key: "alimentacion", emoji: "🥗", name: "Alimentación",
    description: "Comer para sentirte mejor.",
    articles: [
      { title: "Patrón mediterráneo adaptado",
        body: "Verduras de hoja, legumbres, pescado azul, aceite de oliva, frutos secos. Añade fitoestrógenos suaves: tofu, edamame, semillas de lino." },
      { title: "Proteína en cada comida",
        body: "1-1.2 g de proteína por kg de peso al día protege músculo y huesos. Distribúyela: huevo o yogur en desayuno, legumbres o pescado en comidas." },
    ],
  },
  {
    key: "estres", emoji: "🌿", name: "Estrés",
    description: "Calma tu sistema nervioso.",
    articles: [
      { title: "Coherencia cardíaca",
        body: "Respira 6 veces por minuto (inhala 5s, exhala 5s) durante 5 minutos, 3 veces al día. Reduce cortisol y mejora la variabilidad cardíaca." },
      { title: "Naturaleza, aunque sean 10 minutos",
        body: "Caminar entre árboles o cuidar plantas baja el estrés medido en saliva. Cuenta como medicina suave y gratuita." },
    ],
  },
];

function BibliotecaPage() {
  const [open, setOpen] = useState<Category | null>(null);

  if (open) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setOpen(null)} className="-ml-2"><ArrowLeft className="mr-1 h-4 w-4" /> Biblioteca</Button>
        <header>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{open.emoji} Categoría</p>
          <h1 className="mt-1 text-3xl font-semibold">{open.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{open.description}</p>
        </header>
        <div className="space-y-3">
          {open.articles.map((a, i) => (
            <Card key={i} className="rounded-2xl border-0 p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold text-foreground">{a.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
            </Card>
          ))}
        </div>
        <p className="pt-2 text-center text-xs text-muted-foreground">Contenido informativo. No reemplaza el consejo médico profesional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Aprende y cuídate</p>
        <h1 className="mt-1 text-3xl font-semibold">Biblioteca</h1>
      </header>
      <div className="space-y-3">
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setOpen(c)} className="w-full text-left">
            <Card className="flex items-center gap-4 rounded-2xl border-0 p-4 shadow-[var(--shadow-soft)] transition hover:scale-[1.01]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-2xl">{c.emoji}</div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
