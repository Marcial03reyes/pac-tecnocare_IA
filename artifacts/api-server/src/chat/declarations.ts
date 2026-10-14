import { Type, type FunctionDeclaration } from "@google/genai";
import { CHAT_STAGES, TEMPERATURES } from "./contracts";

const string = (description: string) => ({ type: Type.STRING, description });
const optional = (description: string) => ({ ...string(description), nullable: true });
const stage = { type: Type.STRING, enum: [...CHAT_STAGES] };
const temperature = { type: Type.STRING, enum: [...TEMPERATURES] };
const properties = {
  institucion: optional("Institución o consultorio"), especialidad: optional("Especialidad profesional"),
  telefono: optional("Teléfono real"), email: optional("Correo real"),
};
export const DECLARATIONS: FunctionDeclaration[] = [
  { name: "buscar_contactos", description: "Buscar contactos por nombre o institución. Texto vacío devuelve la cartera disponible para filtrar etapas/temperatura.", parameters: { type: Type.OBJECT, properties: { texto: string("Texto de búsqueda, o vacío para cartera") }, required: ["texto"] } },
  { name: "ver_contacto", description: "Datos del contacto y reuniones más recientes primero, incluido análisis y transcripción si existe.", parameters: { type: Type.OBJECT, properties: { cliente_id: string("ID real del contacto") }, required: ["cliente_id"] } },
  { name: "seguimientos", description: "Contactos con seguimiento dentro del rango de fechas inclusivo de Perú.", parameters: { type: Type.OBJECT, properties: { desde: string("YYYY-MM-DD"), hasta: string("YYYY-MM-DD") }, required: ["desde", "hasta"] } },
  { name: "crear_contacto", description: "PREPARAR propuesta de nuevo contacto, NO guardar. Inicia en Lead sin temperatura. Exige Confirmar en la interfaz.", parameters: { type: Type.OBJECT, properties: { nombre: string("Nombre real obligatorio"), ...properties, origen: { type: Type.STRING, enum: ["Apollo", "Evento", "Referido", "Web", "Otro"] } }, required: ["nombre"] } },
  { name: "actualizar_contacto", description: "PREPARAR propuesta de actualización, NO guardar. Consultar contacto antes y confirmar con botones.", parameters: { type: Type.OBJECT, properties: {
    cliente_id: string("ID real del contacto"), campos: { type: Type.OBJECT, properties: {
      etapa_actual: stage, temperatura_actual: { ...temperature, nullable: true },
      proximo_contacto_fecha: optional("YYYY-MM-DD; null para quitar fecha"),
      proximo_contacto_motivo: optional("Motivo comercial del seguimiento"), ...properties,
      motivo_perdida: optional("Motivo explícito de pérdida"),
    } },
  }, required: ["cliente_id", "campos"] } },
  { name: "registrar_reunion", description: "PREPARAR reunión de Chat PAC y actualización del contacto, NO guardar. Exige identificación inequívoca y Confirmar. No inventar contenido.", parameters: { type: Type.OBJECT, properties: {
    cliente_id: string("ID real"), fecha_reunion: string("Fecha ISO con hora y offset -05:00 de Perú"),
    etapa: stage, temperatura: temperature, transcripcion_resumen: string("Resumen comercial, sin información personal sensible"),
    objeciones_detectadas: optional("Objeciones comerciales"), acuerdos_proximo_paso: optional("Acuerdos y próximo paso"),
    borrador_whatsapp: string("Usted, máximo 5 líneas, sólo lo acordado, sin saludo horario ni promesas inventadas"),
    proximo_contacto_fecha: optional("YYYY-MM-DD si se indicó; null para quitar"), proximo_contacto_motivo: optional("Motivo comercial si se indicó"),
  }, required: ["cliente_id", "fecha_reunion", "etapa", "temperatura", "transcripcion_resumen", "borrador_whatsapp"] } },
];
