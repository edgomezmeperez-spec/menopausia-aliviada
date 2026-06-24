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
  {

    key: "yoga", emoji: "🧘‍♀️", name: "Yoga en la menopausia",
    description: "Rutina personalizada de yoga para aliviar síntomas.",
    articles: [
      { title: "Por qué el yoga ayuda en esta etapa",
        body: "Combina movimiento suave, respiración consciente y relajación. Reduce sofocos, mejora el ánimo, alivia dolores articulares y favorece un sueño más profundo." },
      { title: "Rutina diaria de 15 minutos",
        body: "1) Gato-vaca (1 min) para movilizar columna. 2) Postura del niño (2 min) para calmar el sistema nervioso. 3) Guerrero II (1 min por lado) para fortalecer piernas y caderas. 4) Torsión sentada (1 min por lado) para digestión. 5) Piernas en la pared (5 min) para circulación y descanso." },
      { title: "Posturas específicas según síntoma",
        body: "Sofocos: postura del cadáver con respiración fresca (sitali). Ansiedad: flexiones hacia delante suaves. Insomnio: piernas en la pared antes de dormir. Dolor lumbar: postura del puente con bloque." },
    ],
  },
  {
    key: "nutricion-edad", emoji: "🍎", name: "Nutrición personalizada para tu edad",
    description: "Plan nutricional adaptado a tu etapa.",
    articles: [
      { title: "Tus necesidades cambian a partir de los 45",
        body: "Disminuye el metabolismo basal y aumentan los requerimientos de calcio, vitamina D, magnesio y proteína. Comer menos no es la respuesta: comer mejor sí." },
      { title: "Plato ideal en menopausia",
        body: "½ del plato verduras de colores, ¼ proteína (pescado, huevo, legumbres, tofu), ¼ carbohidrato complejo (quinoa, avena, batata). Añade una grasa buena: aguacate, aceite de oliva o frutos secos." },
      { title: "Nutrientes clave",
        body: "Calcio (1200 mg/día): lácteos, sardinas, tahini, brócoli. Vitamina D: sol 15 min + suplemento si tu médica lo indica. Omega-3: pescado azul 2-3 veces por semana. Magnesio: semillas de calabaza, cacao, espinacas." },
    ],
  },
  {
    key: "ejercicio-sueno", emoji: "🏃‍♀️", name: "Ejercicio para mejorar tu sueño",
    description: "Actividades que mejoran la calidad del sueño.",
    articles: [
      { title: "Cómo el movimiento te ayuda a dormir",
        body: "El ejercicio regular regula el cortisol, aumenta la adenosina (presión de sueño) y mejora la temperatura corporal, facilitando dormirte más rápido y tener sueño más profundo." },
      { title: "Mejores ejercicios y cuándo hacerlos",
        body: "Mañana: caminata enérgica 30 min con luz solar para regular tu reloj biológico. Tarde: fuerza ligera o pilates 2-3 veces por semana. Evita ejercicio intenso después de las 19h: eleva cortisol y dificulta conciliar el sueño." },
      { title: "Rutina relajante antes de dormir",
        body: "Estiramientos suaves 10 min: postura del niño, torsión acostada, piernas en la pared. Combínalos con respiración 4-7-8 (inhala 4s, retén 7s, exhala 8s) para activar el sistema nervioso parasimpático." },
    ],
  },
  {
    key: "estres-ansiedad", emoji: "🌬️", name: "Manejo del estrés y ansiedad",
    description: "Técnicas de relajación efectiva.",
    articles: [
      { title: "Por qué la menopausia amplifica la ansiedad",
        body: "La caída del estrógeno reduce serotonina y GABA, neurotransmisores que calman. No es debilidad, es química. Tratarlo con técnicas concretas funciona." },
      { title: "Respiración 4-7-8",
        body: "Inhala 4 segundos por la nariz, retén 7 segundos, exhala 8 segundos por la boca. Repite 4 ciclos. Hazlo al despertar, antes de comidas y antes de dormir. Reduce ansiedad en minutos." },
      { title: "Mindfulness en 5 minutos",
        body: "Siéntate, cierra los ojos y nombra: 5 cosas que oyes, 4 que sientes en tu cuerpo, 3 emociones presentes, 2 pensamientos, 1 deseo. Te trae al presente y rompe el bucle ansioso." },
      { title: "Hábitos antiestrés diarios",
        body: "Camina en naturaleza 20 min/día, limita cafeína a antes de las 14h, escribe 3 cosas que agradeces antes de dormir, llama a una amiga 1 vez por semana. La conexión humana baja cortisol." },
    ],
  },
  {
    key: "intimidad", emoji: "💕", name: "Intimidad durante la menopausia",
    description: "Consejos para mantener una vida íntima plena.",
    articles: [
      { title: "Cambios normales y cómo abordarlos",
        body: "La sequedad vaginal, menos libido y molestias durante el sexo son comunes por la bajada de estrógenos. Tienen solución y hablar de ello con tu pareja y tu médica es el primer paso." },
      { title: "Soluciones para la sequedad",
        body: "Hidratantes vaginales sin hormonas (2-3 veces/semana). Lubricantes con base de agua o silicona durante las relaciones. Tu ginecóloga puede valorar terapia hormonal local en crema u óvulos: muy efectiva y segura." },
      { title: "Recuperar el deseo",
        body: "El deseo en esta etapa suele ser más reactivo que espontáneo: aparece con el contacto, no antes. Prioriza tiempo de calidad sin prisa, juegos previos largos y comunicación abierta con tu pareja." },
      { title: "Suelo pélvico fuerte",
        body: "Ejercicios de Kegel diarios mejoran sensaciones, lubricación natural y previenen incontinencia. Contrae como si retuvieras el pis durante 5 segundos, relaja 5 segundos. 10 repeticiones, 3 veces al día." },
    ],
  },
  {
    key: "sofocos", emoji: "🔥", name: "Sofocos: causas y soluciones",
    description: "Entiende y controla los sofocos.",
    articles: [
      { title: "Qué son y por qué ocurren",
        body: "El hipotálamo, tu termostato interno, se vuelve más sensible por la caída de estrógenos y dispara una respuesta de calor brusca. Duran 1-5 minutos y pueden ir acompañados de sudor, palpitaciones o ansiedad." },
      { title: "Disparadores frecuentes a evitar",
        body: "Alcohol (sobre todo vino tinto), cafeína, comidas picantes, azúcar, estrés agudo, ambientes calurosos y ropa sintética. Lleva un diario 2 semanas para detectar tus disparadores personales." },
      { title: "Estrategias que funcionan",
        body: "Vístete en capas con tejidos naturales (algodón, lino, bambú). Ten un ventilador y agua fría cerca. Respiración pausada al inicio del sofoco (inhala 5s, exhala 5s) acorta su duración. Practica yoga, meditación o tai chi: reducen frecuencia hasta un 50%." },
      { title: "Aliados naturales y médicos",
        body: "Fitoestrógenos suaves (soja fermentada, lino molido), salvia en infusión y magnesio pueden ayudar. Si los sofocos afectan tu calidad de vida, consulta sobre terapia hormonal: es segura para la mayoría de mujeres en los primeros años de menopausia." },
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
