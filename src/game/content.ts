export const ZONE_IDS = [
  "colegio",
  "plaza",
  "casas",
  "hospital",
  "parroquia",
  "arroyo",
] as const;

export type ZoneId = (typeof ZONE_IDS)[number];

export type Suit = "azul" | "verde" | "amarillo" | "rojo" | "wild";

export type Mode = "learn" | "arcade";

export const SUIT_NAME: Record<Suit, string> = {
  azul: "Infraestructura",
  verde: "Naturaleza",
  amarillo: "Comunidad",
  rojo: "Emergencia",
  wild: "Comodín",
};

export type ZoneInfo = {
  id: ZoneId;
  name: string;
  suit: Exclude<Suit, "wild">;
  vital: boolean;
};

export const ZONES: ZoneInfo[] = [
  { id: "colegio", name: "Colegio", suit: "amarillo", vital: true },
  { id: "plaza", name: "Plaza", suit: "verde", vital: false },
  { id: "casas", name: "Casas", suit: "rojo", vital: false },
  { id: "hospital", name: "Hospital", suit: "azul", vital: true },
  { id: "parroquia", name: "Parroquia", suit: "amarillo", vital: false },
  { id: "arroyo", name: "Arroyo", suit: "azul", vital: false },
];

export function zoneInfo(id: ZoneId): ZoneInfo {
  return ZONES.find((z) => z.id === id) ?? ZONES[0];
}

export type CardDef = {
  key: string;
  suit: Suit;
  n: number;
  title: string;
  detail: string;
};

export const CATALOG: CardDef[] = [
  {
    key: "desague",
    suit: "azul",
    n: 1,
    title: "Desagüe limpio",
    detail: "Sin basura, el agua corre y no se estanca.",
  },
  {
    key: "bomba",
    suit: "azul",
    n: 2,
    title: "Bomba de achique",
    detail: "Saca el agua cuando el desagüe no alcanza.",
  },
  {
    key: "arboles",
    suit: "verde",
    n: 1,
    title: "Más árboles",
    detail: "El pasto y los árboles absorben la lluvia.",
  },
  {
    key: "jardin",
    suit: "verde",
    n: 2,
    title: "Jardín de lluvia",
    detail: "Un cantero hundido que funciona como esponja.",
  },
  {
    key: "vecinos",
    suit: "amarillo",
    n: 1,
    title: "Vecinos en alerta",
    detail: "Avisarse a tiempo salva casas y personas.",
  },
  {
    key: "simulacro",
    suit: "amarillo",
    n: 2,
    title: "Simulacro barrial",
    detail: "Practicar qué hacer baja el pánico.",
  },
  {
    key: "evacua",
    suit: "rojo",
    n: 1,
    title: "Evacuación",
    detail: "Salir antes es más seguro que esperar.",
  },
  {
    key: "rescate",
    suit: "rojo",
    n: 2,
    title: "Equipo de rescate",
    detail: "Bomberos y Defensa Civil llegan más rápido.",
  },
  {
    key: "wild",
    suit: "wild",
    n: 0,
    title: "Alerta meteorológica",
    detail: "Si respondés bien, baja 1 en todo el barrio.",
  },
];

export type Question = {
  q: string;
  options: [string, string, string];
  answer: 0 | 1 | 2;
  info: string;
};

export const QUESTIONS: Question[] = [
  {
    q: "¿Qué es El Niño?",
    options: [
      "Un calentamiento del Pacífico ecuatorial que cambia el clima",
      "Un huracán del Atlántico",
      "Un tipo de granizo",
    ],
    answer: 0,
    info: "En Argentina suele traer más lluvias al litoral y a la región pampeana.",
  },
  {
    q: "¿Qué superficie absorbe más agua de lluvia?",
    options: ["Asfalto", "Plaza con pasto y árboles", "Vereda de cemento"],
    answer: 1,
    info: "Cuanto más suelo verde, menos agua corre por la calle.",
  },
  {
    q: "Hay alerta por tormenta fuerte. ¿Qué conviene hacer?",
    options: [
      "Cruzar el arroyo rápido",
      "Quedarse en la orilla a mirar",
      "Alejarse de zonas bajas y seguir a Defensa Civil",
    ],
    answer: 2,
    info: "Los avisos oficiales y las zonas altas son la prioridad.",
  },
  {
    q: "¿Por qué no hay que tirar basura en la calle?",
    options: [
      "Tapa los desagües y el agua no escurre",
      "Solo porque ensucia la vereda",
      "Porque atrae al viento",
    ],
    answer: 0,
    info: "Un desagüe tapado convierte una lluvia común en inundación.",
  },
  {
    q: "¿Qué es una sudestada?",
    options: [
      "Viento del sudeste que empuja el agua del río hacia la costa",
      "Una lluvia que dura un minuto",
      "Un temblor suave",
    ],
    answer: 0,
    info: "En el Río de la Plata puede hacer subir el agua e inundar zonas bajas.",
  },
  {
    q: "El agua ya cubre la calle. ¿Qué hacés?",
    options: [
      "Cruzar si parece poca",
      "No entrar: aunque se vea baja, puede arrastrarte",
      "Sacar una foto en el medio",
    ],
    answer: 1,
    info: "Quince centímetros de agua en movimiento alcanzan para tirar a una persona.",
  },
  {
    q: "¿Para qué sirve un jardín de lluvia?",
    options: [
      "Solo para decorar",
      "Para frenar y absorber el agua antes del desagüe",
      "Para que el viento pase más rápido",
    ],
    answer: 1,
    info: "Retiene la lluvia en el suelo en vez de mandarla toda a la calle.",
  },
  {
    q: "¿A quién conviene avisar primero?",
    options: [
      "A nadie: cada uno se arregla",
      "A vecinas y vecinos, sobre todo en zonas bajas",
      "Recién cuando el agua entra a la casa",
    ],
    answer: 1,
    info: "Una cadena de avisos barrial gana los minutos que importan.",
  },
  {
    q: "¿Por qué el colegio y el hospital son zonas vitales?",
    options: [
      "Si se inundan, el barrio se queda sin un lugar esencial",
      "Porque tienen mejor vista",
      "Porque el agua ahí se evapora sola",
    ],
    answer: 0,
    info: "Protegerlos primero es proteger a quien más necesita el barrio.",
  },
  {
    q: "¿Qué diferencia hay entre clima y tiempo?",
    options: [
      "Ninguna",
      "El tiempo es lo de hoy; el clima es el patrón de muchos años",
      "El clima dura una tarde",
    ],
    answer: 1,
    info: "El Niño altera el clima de una temporada, y eso se siente en cada tormenta.",
  },
];

export type EventId =
  | "lluvia"
  | "sudestada"
  | "desborde"
  | "tormenta"
  | "calma"
  | "nino"
  | "granizo"
  | "basura"
  | "nocturno";

export type EventDef = {
  id: EventId;
  title: string;
  blurb: string;
};

export const EVENTS: Record<EventId, EventDef> = {
  lluvia: {
    id: "lluvia",
    title: "Lluvia intensa",
    blurb: "Se mojan dos zonas al azar.",
  },
  sudestada: {
    id: "sudestada",
    title: "Sudestada",
    blurb: "El viento empuja el río hacia el arroyo y las casas.",
  },
  desborde: {
    id: "desborde",
    title: "Desborde del arroyo",
    blurb: "El arroyo se sale de su cauce.",
  },
  tormenta: {
    id: "tormenta",
    title: "Tormenta eléctrica",
    blurb: "Corte de luz y lluvia sobre el colegio y el hospital.",
  },
  calma: {
    id: "calma",
    title: "Día de calma",
    blurb: "Un respiro: el pronóstico no suma agua.",
  },
  nino: {
    id: "nino",
    title: "Súper Niño",
    blurb: "Lluvias extremas en todo el barrio.",
  },
  granizo: {
    id: "granizo",
    title: "Granizo",
    blurb: "Piedras y agua sobre el colegio, la plaza y las casas.",
  },
  basura: {
    id: "basura",
    title: "Desagües tapados",
    blurb: "La basura no deja escapar el agua de las casas.",
  },
  nocturno: {
    id: "nocturno",
    title: "Temporal nocturno",
    blurb: "La lluvia agarra al hospital, la parroquia y el arroyo.",
  },
};
