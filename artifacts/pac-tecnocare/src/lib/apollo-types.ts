/** Synthetic examples; never fetched from the real Apollo service. */
export interface ApolloLead {
  id: string;
  nombre: string;
  institucion: string;
  especialidad: string;
  ciudad: string;
  afinidad: number;
  ofreceOzono: boolean;
  nota: string;
  telefono: string;
  email: string;
  /** true = prospecto real de la tabla `prospectos` (agente de prospección), no un ejemplo. */
  real?: boolean;
  prospectoId?: number;
  web?: string | null;
  /** Teléfono fijo (no sirve para WhatsApp). */
  fijo?: string | null;
  producto?: string | null;
}

export interface ApolloContactResult {
  clienteId: string | number;
  created: boolean;
}
