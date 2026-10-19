/** Contenido de la web pública de TECNOCARE (tomado de tecnology.care, corregido y ordenado). */

export const CONTACTO = {
  whatsapp: "51957615152",
  telefono: "+51 957 615 152",
  correo: "info@tecnology.care",
  direccion: "Pueblo Libre 15084, Lima, Perú",
  razonSocial: "Tecnology Care S.R.L.",
  redes: [
    { nombre: "Facebook", url: "https://www.facebook.com/profile.php?id=61577800113798" },
    { nombre: "LinkedIn", url: "https://www.linkedin.com/in/tecnocare/" },
    { nombre: "YouTube", url: "https://www.youtube.com/channel/UCMCxLquhVsrIRTNC-2H6FtQ" },
  ],
};

/** Enlace de WhatsApp con mensaje prellenado. */
export function whatsapp(mensaje = "Hola TECNOCARE, quisiera más información sobre sus equipos."): string {
  return `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export const cotizarEquipo = (nombre?: string) =>
  whatsapp(nombre ? `Hola TECNOCARE, quisiera una cotización del ${nombre}.` : "Hola TECNOCARE, quisiera solicitar una cotización.");

export type Familia = "ozono" | "infusion";

export interface Producto {
  slug: string;
  nombre: string;
  familia: Familia;
  etiqueta: string; // especialidad o uso
  subtitulo: string;
  resumen: string; // tarjeta del catálogo
  descripcion: string;
  registro: string[]; // línea de certificaciones
  destacado: { label: string; valor: string };
  caracteristicas: { titulo: string; texto: string }[];
  specs: [string, string][];
  entrega: string[];
  relacionados: string[];
  ficha?: string;
  bajoPedido?: boolean;
  imagen?: "om302";
}

const ENTREGA_OZONETTE = [
  "Equipo Ozonette y accesorios estándar",
  "Capacitación operativa del personal",
  "Garantía del fabricante y soporte local",
  "Instalación y puesta en marcha en sitio",
  "Acompañamiento clínico inicial (opcional)",
  "Documentación de respaldo",
];

const SPECS_OZONETTE: [string, string][] = [
  ["Rango de concentración", "1–80 µg/Nml, en pasos de 1 µg/Nml"],
  ["Caudal de ozono", "10–50 L/h, ajustable digitalmente"],
  ["Rendimiento", "3 g/h"],
  ["Control", "Táctil digital con pantalla LCD gráfica"],
  ["Alimentación", "100–240 V, 50–60 Hz"],
  ["Dimensiones", "25 × 27 × 12 cm"],
  ["Peso", "3 kg"],
  ["Certificaciones", "CE, RoHS, MDD Clase IIb"],
];

const CARACT_OZONETTE = (modoTres: string) => [
  { titulo: "Medición ACM normalizada", texto: "Corrige la medición por presión y temperatura para que la concentración mostrada sea la real." },
  { titulo: "Tres modos de operación", texto: `Jeringa con detección automática de tamaño, continuo con caudal independiente y ${modoTres}.` },
  { titulo: "Detección automática de sobrepresión", texto: "Sistema de doble válvula con compensación automática que evita escapes no deseados." },
  { titulo: "Doble catalizador de eliminación", texto: "Dos circuitos independientes con dos catalizadores internos, sin mantenimiento anual." },
];

const REGISTRO_OZONETTE = ["RS DIGEMID DB7384E", "Marcado CE", "Clase IIb", "RoHS"];

export const PRODUCTOS: Producto[] = [
  {
    slug: "ozonette", nombre: "Ozonette", familia: "ozono", etiqueta: "Medicina",
    subtitulo: "Generador compacto de ozono médico",
    resumen: "Generador compacto, rango 1–80 µg/Nml, tres modos de operación y control táctil digital.",
    descripcion: "Equipo de mesa para aplicaciones que requieren una medición precisa y reproducible de la concentración de ozono, según estándares internacionales.",
    registro: REGISTRO_OZONETTE, destacado: { label: "Rango de O₃", valor: "1–80 µg/Nml" },
    caracteristicas: CARACT_OZONETTE("manual con control total del usuario"), specs: SPECS_OZONETTE, entrega: ENTREGA_OZONETTE,
    relacionados: ["ozonette-dent", "ozonette-woman-care", "ozonobaric-p"],
    ficha: "https://drive.google.com/file/d/1_AcRPYHjPMm9hvjBatPMu8LFizV4Wcss/view?usp=drive_link"
  },
  {
    slug: "ozonette-dent", nombre: "Ozonette Dent", familia: "ozono", etiqueta: "Odontología",
    subtitulo: "Generador compacto de ozono médico para odontología",
    resumen: "Configuración odontológica con inyector de O₃, salida de doble válvula y compensación de presión.",
    descripcion: "Equipo de mesa con medición precisa y reproducible de la concentración de ozono, con modo inyector de O₃ para la práctica odontológica.",
    registro: REGISTRO_OZONETTE, destacado: { label: "Caudal", valor: "10–50 L/h" },
    caracteristicas: CARACT_OZONETTE("modo inyector de O₃"), specs: SPECS_OZONETTE, entrega: ENTREGA_OZONETTE,
    relacionados: ["ozonette", "ozonette-woman-care", "ozonobaric-p"],
    ficha: "https://drive.google.com/file/d/1GYaOJRoj8CLaJH7g1B22iUWwg_eFZACI/view?usp=drive_link",
  },
  {
    slug: "ozonette-woman-care", nombre: "Ozonette Woman Care", familia: "ozono", etiqueta: "Ginecología",
    subtitulo: "Generador compacto de ozono médico para ginecología",
    resumen: "Modo de insuflación con ajuste de caudal y corte por sobrepresión, sujeto a análisis de riesgo.",
    descripcion: "Equipo de mesa con medición precisa y reproducible de la concentración de ozono, con modo de insuflación bajo control total del usuario.",
    registro: REGISTRO_OZONETTE, destacado: { label: "Rendimiento", valor: "3 g/h" },
    caracteristicas: CARACT_OZONETTE("modo de insuflación con control total del usuario"), specs: SPECS_OZONETTE, entrega: ENTREGA_OZONETTE,
    relacionados: ["ozonette", "ozonette-vet", "ozonobaric-p"],
    ficha: "https://drive.google.com/file/d/1RYtYYUazVxs5HUPWUIe8H63ms4BvMori/view?usp=drive_link",
  },
  {
    slug: "ozonette-vet", nombre: "Ozonette Vet", familia: "ozono", etiqueta: "Veterinaria",
    subtitulo: "Generador compacto de ozono médico para veterinaria",
    resumen: "Para clínicas veterinarias de pequeñas especies, con los mismos modos y la misma precisión de medición.",
    descripcion: "Equipo de mesa con medición precisa y reproducible de la concentración de ozono, pensado para la clínica veterinaria.",
    registro: REGISTRO_OZONETTE, destacado: { label: "Rango de O₃", valor: "1–80 µg/Nml" },
    caracteristicas: CARACT_OZONETTE("manual con control total del usuario"), specs: SPECS_OZONETTE, entrega: ENTREGA_OZONETTE,
    relacionados: ["ozonette", "ozonette-woman-care", "ozonobaric-p"],
    ficha: "https://drive.google.com/file/d/11k1zOEu6AgNR0XlzlO3GqI8GvnT-k2RI/view?usp=drive_link",
  },
  {
    slug: "ozonobaric-p", nombre: "Ozonobaric P", familia: "ozono", etiqueta: "Portátil",
    subtitulo: "Generador de ozono médico portátil en maletín hermético",
    resumen: "Maletín IP67 resistente a impactos, doble sistema de medición y bomba de vacío integrada.",
    descripcion: "Maletín IP67 resistente a impactos para uso clínico o de campo, con doble sistema de medición, bomba de vacío integrada y válvula de presión con corte automático.",
    registro: ["RS DIGEMID DB7428E", "Marcado CE", "Clase IIb", "IP67", "Impacto NK-7"], destacado: { label: "Medición", valor: "Dual" },
    caracteristicas: [
      { titulo: "Doble sistema de medición", texto: "Sensor fotométrico LED directo para lectura continua y sistema ACM indirecto de alta precisión." },
      { titulo: "Maletín hermético certificado", texto: "Resistente al agua, al polvo y a impactos (NK-7); apto para exteriores y traslados frecuentes." },
      { titulo: "Bomba de vacío integrada", texto: "Hasta −0.68 bar, con salidas independientes de ozono y vacío con conexión Lüer-lock estándar." },
      { titulo: "Cinco modos de operación", texto: "Jeringa, dosis, bolsa, continuo y vacío, con software de dosis única y control de presión." },
    ],
    specs: [
      ["Rango de concentración", "1–80 µg/Nml, normalizado"],
      ["Caudal ajustable", "20–50 L/h, manual y dinámico"],
      ["Rendimiento", "3 g/h"],
      ["Vacío máximo", "−0.68 bar (8.7 PSI)"],
      ["Alimentación", "100–230 VAC, 50–60 Hz, 145 VA"],
      ["Entrada de oxígeno", "1.5–3.5 bar, conector rápido"],
      ["Dimensiones", "51 × 41 × 20 cm"],
      ["Peso", "9 kg (sin bala de oxígeno)"],
      ["Certificaciones", "CE 0120, Clase IIb, UL, CSA"],
    ],
    entrega: ["Equipo Ozonobaric P y accesorios estándar", ...ENTREGA_OZONETTE.slice(1)],
    relacionados: ["ozonette", "ozonette-vet", "om-302-d"],
    ficha: "https://drive.google.com/file/d/19lXcx2_7JcQ6Fn59VfaB81m-_mMHjYzL/view?usp=drive_link",
  },
  {
    slug: "om-302-d", nombre: "OM-302 D", familia: "ozono", etiqueta: "Alta gama", bajoPedido: true,
    subtitulo: "Generador de ozono médico premium con doble sistema de medición",
    resumen: "Pantalla táctil de 10.1\", 7 modos de operación y hasta 10 protocolos por aplicación. Bajo pedido.",
    descripcion: "Para terapias hiperbáricas y normobáricas, con pantalla táctil de 10.1\", siete modos de operación y hasta diez protocolos configurables por aplicación, desarrollado con líderes de opinión internacionales.",
    registro: ["Disponible bajo pedido", "Marcado CE", "Clase IIb", "RoHS"], destacado: { label: "Modos y protocolos", valor: "7 · 10" },
    caracteristicas: [
      { titulo: "Doble sistema de medición (DSM)", texto: "Mide la concentración dos veces con corrección dinámica ante cambios de temperatura y presión." },
      { titulo: "Normalización automática", texto: "El sistema N ajusta temperatura y presión para que la concentración mostrada sea la que recibe el paciente." },
      { titulo: "Hasta 10 protocolos por aplicación", texto: "Software desarrollado con líderes de opinión para protocolizar tratamientos, con interfaz configurable." },
      { titulo: "Control dinámico de caudal", texto: "DC Dynamic Flow Control con corte automático por sobrepresión y siete modos de operación." },
    ],
    specs: [
      ["Rango de concentración", "1–80 µg/Nml"],
      ["Caudal de ozono", "10–50 L/h"],
      ["Rendimiento máximo", "3 g/h"],
      ["Modos de operación", "7"],
      ["Presión máxima de salida", "0.7 bar / 10.2 PSI"],
      ["Vacío", "−0.7 bar / 10.2 PSI"],
      ["Alimentación", "100–230 V, 50/60 Hz, <120 VA"],
      ["Pantalla", "LCD táctil IPS TFT a color de 10.1\""],
      ["Conexión", "Lüer-lock"],
      ["Dimensiones", "48 × 56.5 × 18.5 cm"],
      ["Peso", "16 kg"],
      ["Certificaciones", "CE, RoHS, Clase IIb"],
    ],
    entrega: [
      "Equipo OM-302 D con accesorios estándar",
      "Capacitación operativa avanzada del personal",
      "Garantía extendida del fabricante y soporte local",
      "Instalación y puesta en marcha en sitio",
      "Acompañamiento clínico inicial con médico especialista",
      "Documentación de respaldo",
    ],
    relacionados: ["ozonette", "ozonobaric-p", "ozonette-dent"],
    ficha: "https://drive.google.com/file/d/1GjHYY1OBR9ynladOY4LhNqmIaqNFtMKe/view?usp=drive_link", imagen: "om302",
  },
  {
    slug: "easyflow-r", nombre: "Easyflow-R", familia: "infusion", etiqueta: "Infusión elastomérica",
    subtitulo: "Sistema de infusión elastomérico con carcasa rígida",
    resumen: "Infusor elastomérico con carcasa rígida, conforme a ISO 28620, flujos de 0.5 a 200 ml/h.",
    descripcion: "Dispositivo desechable para infusión continua intravenosa, intraarterial, epidural o subcutánea, con carcasa rígida transparente, puerto cerrado sin aguja y precisión de flujo de ±10 %.",
    registro: ["RS DIGEMID DM31100E", "CE 0051", "ISO 28620", "Libre de látex y DEHP"], destacado: { label: "Rango de flujo", valor: "0.5–200 ml/h" },
    caracteristicas: [
      { titulo: "Sistema cerrado sin aguja", texto: "Puerto de llenado unidireccional que protege al usuario, al personal y al paciente." },
      { titulo: "Filtración integrada", texto: "Filtro en línea de 5 µm para partículas y bacterias, venteo de aire de 0.02 µm y cebado automático." },
      { titulo: "Flujo constante y preciso", texto: "Restrictor plástico con tolerancia de ±10 %, menos sensible a la temperatura y la viscosidad que el vidrio." },
      { titulo: "Carcasa rígida transparente", texto: "Permite ver el avance de la infusión; resistente a UV y libre de DEHP y látex." },
    ],
    specs: [
      ["Vías de administración", "Intravenosa, intraarterial, epidural, subcutánea"],
      ["Rango de flujo", "0.5–200 ml/h"],
      ["Volúmenes nominales", "60 ml, 100 ml y 300 ml"],
      ["Tiempos de infusión", "30 minutos a 25 días, según configuración"],
      ["Restrictor de flujo", "Plástico de alta precisión"],
      ["Conector", "Luer Lock estándar; opciones NRFit® y CSTD"],
      ["Filtración", "5 µm partículas + 0.02 µm aire"],
      ["Composición", "Libre de látex y DEHP, resistente a UV"],
      ["Esterilización", "Óxido de etileno (EO)"],
      ["Certificaciones", "CE 0051, ISO 28620"],
    ],
    entrega: [
      "Easyflow-R en la presentación solicitada",
      "Información de compatibilidad con los principales fármacos",
      "Soporte técnico local en el Perú",
      "Asesoría para elegir la configuración",
      "Respaldo del fabricante Adria Med (Italia)",
      "Documentación regulatoria",
    ],
    relacionados: [],
    ficha: "https://drive.google.com/file/d/1jh4QIld8SET4hc2P60axQyhqRC9xmad-/view?usp=drive_link",
  },
];

export const producto = (slug: string) => PRODUCTOS.find((p) => p.slug === slug);

export const CERTIFICACIONES = ["Fabricante SEDECAL · España", "Marcado CE", "Conformidad RoHS", "ISO 9001 / 13485", "Registro DIGEMID"];

export const POR_QUE = [
  { titulo: "Tecnología europea certificada", texto: "Fabricados por SEDECAL en España, con marcado CE y conformidad RoHS bajo sistema de calidad ISO." },
  { titulo: "Medición precisa y normalizada", texto: "Doble sistema de medición y normalización por presión y temperatura para concentraciones reproducibles." },
  { titulo: "Registro DIGEMID", texto: "Registro sanitario vigente; importación por droguería autorizada." },
  { titulo: "Servicio y soporte local", texto: "Instalación, capacitación, garantía, repuestos y soporte técnico en el Perú." },
];

export const SERVICIO = [
  { titulo: "Instalación y puesta en marcha", texto: "En sitio, con formatos de documentación clínica." },
  { titulo: "Capacitación operativa", texto: "Manejo del equipo, modos, seguridad y mantenimiento básico." },
  { titulo: "Acompañamiento clínico", texto: "Formación con un médico con experiencia, según tu especialidad." },
  { titulo: "Postventa", texto: "Garantía, repuestos y soporte técnico local." },
  { titulo: "Respaldo documental", texto: "Declaración de Madrid y dossier de homologación." },
];

export const PRESENCIA = {
  cifras: [["6", "equipos instalados"], ["5", "hospitales"], ["3", "regiones"]] as [string, string][],
  regiones: [
    { region: "Lima", area: "Medicina física y terapia del dolor" },
    { region: "Lambayeque", area: "Terapia del dolor" },
    { region: "San Martín", area: "Medicina física" },
  ],
};

export const RESPALDO = [
  ["RS DIGEMID DB7384E", "Ozonette"],
  ["RS DIGEMID DB7428E", "Ozonobaric P"],
  ["Marcado CE · Clase IIb", "Dispositivo médico con organismo notificado"],
  ["RoHS 2011/65/UE", "Declaración de conformidad del fabricante"],
] as [string, string][];

export const TESTIMONIOS = [
  { nombre: "Dr. Felipe Oscano", area: "Terapia del dolor", texto: "Soporte local y repuestos disponibles: clave para un equipo en uso clínico continuo." },
  { nombre: "Dr. Fredy Gutiérrez", area: "Neurocirugía", texto: "La precisión en la concentración y la normalización me dan seguridad en cada sesión." },
];

export const EVENTOS = [
  { tag: "Charla mensual", titulo: "Geometría de la ozonoterapia", texto: "Charla educativa para profesionales de la salud." },
  { tag: "Webinar", titulo: "Dosimetría: medir la dosis real", texto: "Cómo leer y reproducir la concentración de ozono." },
  { tag: "Capacitación", titulo: "Uso seguro del generador", texto: "Modos de operación, seguridad y mantenimiento básico." },
];
