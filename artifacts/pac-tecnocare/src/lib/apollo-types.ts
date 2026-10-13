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
}

export interface ApolloContactResult {
  clienteId: string | number;
  created: boolean;
}
