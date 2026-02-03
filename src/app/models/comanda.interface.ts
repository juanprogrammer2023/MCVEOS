export interface Comanda {
  id?: string; // opcional, porque solo existe cuando lees de Firestore
  numeroComanda: number;
  fecha: string | Date | any;
  itemsAlmuerzo: any[];      // si tienes un modelo de ítems, mejor tiparlo
  itemsEspeciales: any[];
  itemsBebidas: any[];
  itemsAdicionales: any[];
  total: number;
  estado: 'pendiente' | 'preparando' | 'listo' | 'entregado'; // puedes limitar estados
  mesa: string;
  numeroMesa: number;
  clienteId: string;
}
