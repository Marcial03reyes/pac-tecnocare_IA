import type { ApolloLead } from "@/lib/apollo-types";

export const APOLLO_SAMPLE: ApolloLead[] = [
  { id: "a1", nombre: "Dra. Lucía Paredes", institucion: "Clínica Santa Isabel de Miraflores", especialidad: "Medicina física y rehabilitación", ciudad: "Lima", afinidad: 92, ofreceOzono: false, nota: "Abrió una sala nueva de dolor crónico; busca terapias complementarias para hernias." },
  { id: "a2", nombre: "Dr. Martín Quispe", institucion: "Centro Rehab Andino", especialidad: "Traumatología deportiva", ciudad: "Arequipa", afinidad: 88, ofreceOzono: true, nota: "Ya usa ozono con un equipo antiguo; evaluar recambio por equipo europeo." },
  { id: "a3", nombre: "Dra. Gabriela Salinas", institucion: "Clínica del Pie Trujillo", especialidad: "Podología y pie diabético", ciudad: "Trujillo", afinidad: 85, ofreceOzono: false, nota: "Alto volumen de úlceras diabéticas; interés en ozono tópico." },
  { id: "a4", nombre: "Dr. Renzo Villanueva", institucion: "Policlínico San Borja Salud", especialidad: "Medicina del dolor", ciudad: "Lima", afinidad: 81, ofreceOzono: false, nota: "Pidió información tras un congreso de algología en marzo." },
  { id: "a5", nombre: "Dra. Carla Huamán", institucion: "Instituto de Rehabilitación Cayma", especialidad: "Fisioterapia", ciudad: "Arequipa", afinidad: 74, ofreceOzono: false, nota: "Equipo de 6 fisioterapeutas; decisión compartida con gerencia." },
  { id: "a6", nombre: "Dr. Jorge Benavides", institucion: "Clínica Sanna El Golf", especialidad: "Dermatología", ciudad: "Trujillo", afinidad: 68, ofreceOzono: false, nota: "Explora tratamientos estéticos con ozono; presupuesto aún no definido." },
  { id: "a7", nombre: "Dra. Sofía Ramírez", institucion: "Centro Médico Surco Integral", especialidad: "Medicina integrativa", ciudad: "Lima", afinidad: 63, ofreceOzono: true, nota: "Ofrece autohemoterapia; podría ampliar a una segunda sede." },
  { id: "a8", nombre: "Dr. Alonso Cárdenas", institucion: "Clínica Arequipa Vallecito", especialidad: "Odontología", ciudad: "Arequipa", afinidad: 57, ofreceOzono: false, nota: "Curiosidad por ozono dental; requiere demostración presencial." },
  { id: "a9", nombre: "Dra. Paola Linares", institucion: "Fisio Norte Rehab", especialidad: "Rehabilitación neurológica", ciudad: "Trujillo", afinidad: 52, ofreceOzono: false, nota: "Enfoque principal en neuro; ozono sería línea secundaria." },
  { id: "a10", nombre: "Dr. Hugo Medina", institucion: "Clínica Jesús del Norte", especialidad: "Medicina interna", ciudad: "Lima", afinidad: 44, ofreceOzono: false, nota: "Contacto frío; recomendado por un colega de traumatología." },
  { id: "a11", nombre: "Dra. Verónica Tapia", institucion: "Centro Geriátrico Yanahuara", especialidad: "Geriatría", ciudad: "Arequipa", afinidad: 38, ofreceOzono: false, nota: "Prioriza compras de mobiliario este año." },
  { id: "a12", nombre: "Dr. Iván Rojas", institucion: "Policlínico La Esperanza", especialidad: "Medicina general", ciudad: "Trujillo", afinidad: 33, ofreceOzono: false, nota: "Volumen bajo de pacientes con dolor articular." },
  { id: "a13", nombre: "Dra. Mónica Zevallos", institucion: "Clínica Estética Barranco", especialidad: "Medicina estética", ciudad: "Lima", afinidad: 29, ofreceOzono: true, nota: "Ya tiene proveedor de ozono con contrato vigente hasta 2026." },
  { id: "a14", nombre: "Dr. Raúl Chávez", institucion: "Hospital Privado Cerro Colorado", especialidad: "Cirugía general", ciudad: "Arequipa", afinidad: 24, ofreceOzono: false, nota: "Compras centralizadas por licitación; ciclo de venta largo." },
];

export type Tier = "alta" | "media" | "baja";
export const tierOf = (a: number): Tier => (a >= 80 ? "alta" : a >= 50 ? "media" : "baja");
export const TIER_COLOR: Record<Tier, string> = { alta: "#F28C28", media: "#2F6FDB", baja: "#8A94A8" };
