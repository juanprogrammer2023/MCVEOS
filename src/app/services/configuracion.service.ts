import { Injectable, OnDestroy } from '@angular/core';
import { Firestore, doc, onSnapshot, DocumentSnapshot, DocumentData, setDoc, updateDoc, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Mesa {
  numero: number;
  disponible: boolean;
  reservadaPor?: string;
  horaReserva?: Date;
}

export interface ConfiguracionMesas {
  numeroMesas: number;
  mesasOcupadas: any[];
  mesasReservadas: any[];
  mesasDisponibles: Mesa[];
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService implements OnDestroy {

  private numeroMesasSubject = new BehaviorSubject<number>(0);
  numeroMesas$: Observable<number> = this.numeroMesasSubject.asObservable();

  // Nuevo BehaviorSubject para toda la configuración de mesas
  private configuracionMesasSubject = new BehaviorSubject<ConfiguracionMesas>({
    numeroMesas: 0,
    mesasOcupadas: [],
    mesasReservadas: [],
    mesasDisponibles: []
  });
  configuracionMesas$: Observable<ConfiguracionMesas> = this.configuracionMesasSubject.asObservable();

  private unsubscribe: (() => void) | undefined;

  constructor(private firestore: Firestore) {
    this.listenConfiguracionMesas();
  }

  private listenConfiguracionMesas() {
    const docRef = doc(this.firestore, 'configuracion', 'mesas');
    this.unsubscribe = onSnapshot(docRef, (docSnap: DocumentSnapshot<DocumentData>) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const numeroMesas = data?.['numeroMesas'] || 0;
        const mesasOcupadas = data?.['mesasOcupadas'] || [];
        const mesasReservadas = data?.['mesasReservadas'] || [];
        
        // Calcular mesas disponibles
        const mesasDisponibles = this.calcularMesasDisponibles(numeroMesas, mesasOcupadas, mesasReservadas);
        
        // Actualizar ambos subjects
        this.numeroMesasSubject.next(numeroMesas);
        this.configuracionMesasSubject.next({
          numeroMesas,
          mesasOcupadas,
          mesasReservadas,
          mesasDisponibles
        });
      } else {
        // Si no existe el documento, inicializar con valores por defecto
        const configuracionVacia: ConfiguracionMesas = {
          numeroMesas: 0,
          mesasOcupadas: [],
          mesasReservadas: [],
          mesasDisponibles: []
        };
        this.numeroMesasSubject.next(0);
        this.configuracionMesasSubject.next(configuracionVacia);
      }
    }, (error) => {
      console.error('Error escuchando configuración de mesas:', error);
    });
  }

  private calcularMesasDisponibles(numeroMesas: number, mesasOcupadas: any[], mesasReservadas: any[]): Mesa[] {
    const mesasDisponibles: Mesa[] = [];
    
    for (let i = 1; i <= numeroMesas; i++) {
      const estaOcupada = mesasOcupadas.some((mesa: any) => mesa.numeroMesa === i);
      const estaReservada = mesasReservadas.some((mesa: any) => mesa.numeroMesa === i);
      
      mesasDisponibles.push({
        numero: i,
        disponible: !estaOcupada && !estaReservada
      });
    }
    
    return mesasDisponibles;
  }

  /**
   * Actualiza el número de mesas en Firestore
   */
  async actualizarNumeroMesas(nuevoNumero: number): Promise<void> {
    const docRef = doc(this.firestore, 'configuracion', 'mesas');
    try {
      await setDoc(docRef, { 
        numeroMesas: nuevoNumero,
        fechaActualizacion: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error al actualizar el número de mesas:', error);
      throw error;
    }
  }

  /**
   * Reserva una mesa temporalmente
   */
  async reservarMesa(numeroMesa: number, clienteId: string, temporal: boolean = true): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, 'configuracion', 'mesas');
      const reserva = {
        numeroMesa: numeroMesa,
        horaReserva: new Date(),
        clienteId: clienteId,
        estado: temporal ? 'reservada_temporal' : 'reservada'
      };

      await updateDoc(docRef, {
        mesasOcupadas: arrayUnion(reserva)
      });

      return true;
    } catch (error) {
      console.error('Error al reservar mesa:', error);
      return false;
    }
  }

  /**
   * Libera una mesa reservada
   */
  async liberarMesaReservada(numeroMesa: number, clienteId: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, 'configuracion', 'mesas');
      
      // Primero obtenemos la configuración actual para encontrar la reserva exacta
      const configuracionActual = this.configuracionMesasSubject.value;
      const reservaAEliminar = configuracionActual.mesasReservadas.find(
        (reserva: any) => reserva.numeroMesa === numeroMesa && reserva.clienteId === clienteId
      );

      if (reservaAEliminar) {
        await updateDoc(docRef, {
          mesasReservadas: arrayRemove(reservaAEliminar)
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error al liberar mesa reservada:', error);
      return false;
    }
  }

  /**
   * Marca una mesa como ocupada (cuando el cliente llega)
   */
  async ocuparMesa(numeroMesa: number, clienteId: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, 'configuracion', 'mesas');
      
      // Primero liberar la reserva si existe
      await this.liberarMesaReservada(numeroMesa, clienteId);
      
      // Luego marcar como ocupada
      const ocupacion = {
        numeroMesa: numeroMesa,
        horaOcupacion: new Date(),
        clienteId: clienteId,
        estado: 'ocupada'
      };

      await updateDoc(docRef, {
        mesasOcupadas: arrayUnion(ocupacion)
      });

      return true;
    } catch (error) {
      console.error('Error al ocupar mesa:', error);
      return false;
    }
  }

  /**
   * Libera una mesa ocupada (cuando el cliente se va)
   */
  async liberarMesaOcupada(numeroMesa: number, clienteId: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, 'configuracion', 'mesas');
      
      // Encontrar la ocupación exacta
      const configuracionActual = this.configuracionMesasSubject.value;
      const ocupacionAEliminar = configuracionActual.mesasOcupadas.find(
        (ocupacion: any) => ocupacion.numeroMesa === numeroMesa && ocupacion.clienteId === clienteId
      );

      if (ocupacionAEliminar) {
        await updateDoc(docRef, {
          mesasOcupadas: arrayRemove(ocupacionAEliminar)
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error al liberar mesa ocupada:', error);
      return false;
    }
  }

  /**
   * Obtiene el estado actual de una mesa específica
   */
  getEstadoMesa(numeroMesa: number): 'disponible' | 'ocupada' | 'reservada' {
    const configuracion = this.configuracionMesasSubject.value;
    
    const estaOcupada = configuracion.mesasOcupadas.some((mesa: any) => mesa.numeroMesa === numeroMesa);
    if (estaOcupada) return 'ocupada';
    
    const estaReservada = configuracion.mesasReservadas.some((mesa: any) => mesa.numeroMesa === numeroMesa);
    if (estaReservada) return 'reservada';
    
    return 'disponible';
  }

  /**
   * Obtiene todas las mesas disponibles
   */
  getMesasDisponibles(): Mesa[] {
    return this.configuracionMesasSubject.value.mesasDisponibles.filter(mesa => mesa.disponible);
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}