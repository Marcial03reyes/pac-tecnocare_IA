export type Temperatura = "Frio" | "Tibio" | "Caliente";

export interface Cliente {
  id: string | number;
  nombre: string | null;
  institucion: string | null;
  especialidad: string | null;
  telefono: string | null;
  email: string | null;
  created_at: string | null;
  etapa_actual: string | null;
  temperatura_actual: Temperatura | string | null;
  proximo_contacto_fecha: string | null;
  proximo_contacto_motivo: string | null;
  ultima_reunion: string | null;
}

export interface Reunion {
  id: string | number;
  cliente_id: string | number | null;
  fecha_reunion: string | null;
  origen_audio: string | null;
  transcripcion_resumen: string | null;
  temperatura: Temperatura | string | null;
  objeciones_detectadas: string | null;
  feedback_estrategico: string | null;
  borrador_whatsapp: string | null;
  acuerdos_proximo_paso: string | null;
  etapa: string | null;
  proximo_contacto_fecha: string | null;
  analisis: unknown;
  transcripcion: string | null;
}

export interface ReunionConCliente extends Reunion {
  cliente: Pick<Cliente, "id" | "nombre" | "institucion"> | null;
}
