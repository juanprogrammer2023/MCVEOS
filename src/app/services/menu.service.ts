import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  addDoc,
  getDocs,
  onSnapshot,
  deleteDoc
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { Comanda } from '../models/comanda.interface';


@Injectable({
  providedIn: 'root'
})
export class MenuService {
  constructor(
    private firestore: Firestore,
  ) { }

  // Obtener bebidas
  getBebidas(): Observable<any> {
    const docRef = doc(this.firestore, 'menus/bebidas');
    return docData(docRef);
  }

  // Actualizar bebidas (objeto completo)
  async updateBebidas(data: any) {
    const docRef = doc(this.firestore, 'menus/bebidas');
    await updateDoc(docRef, data);
  }

  // Crear/Actualizar el documento de bebidas
  async setBebidas(data: any) {
    const docRef = doc(this.firestore, 'menus/bebidas');
    await setDoc(docRef, data);
  }


  // Obtener almuerzo del día
  getAlmuerzoDelDia(): Observable<any> {
    const docRef = doc(this.firestore, 'menus/almuerzo_del_dia');
    return docData(docRef);
  }

  // Actualizar almuerzo del día (objeto completo)
  async updateAlmuerzoDelDia(data: any) {
    const docRef = doc(this.firestore, 'menus/almuerzo_del_dia');
    await updateDoc(docRef, data);
  }

  // Obtener almuerzos especiales
  getAlmuerzosEspeciales(): Observable<any> {
    const docRef = doc(this.firestore, 'menus/almuerzos_especiales');
    return docData(docRef);
  }

  // Actualizar almuerzos especiales (objeto completo)
  async updateAlmuerzosEspeciales(data: any) {
    const docRef = doc(this.firestore, 'menus/almuerzos_especiales');
    await updateDoc(docRef, data);
  }

  // Crear el documento si no existe
  async setAlmuerzoDelDia(data: any) {
    const docRef = doc(this.firestore, 'menus/almuerzo_del_dia');
    await setDoc(docRef, data);
  }

  async setAlmuerzosEspeciales(data: any) {
    const docRef = doc(this.firestore, 'menus/almuerzos_especiales');
    await setDoc(docRef, data);
  }

  crearComanda(comanda: any) {
    const comandasCollection = collection(this.firestore, 'comandas');
    return from(addDoc(comandasCollection, {
      ...comanda,
      fechaCreacion: new Date(),
      estado: 'pendiente'
    }));
  }

  getComandaActivaPorMesa(numeroMesa: number): Observable<Comanda | null> {
  const comandasCollection = collection(this.firestore, 'comandas');
  const q = query(
    comandasCollection,
    where("numeroMesa", "==", numeroMesa),
    where("estado", "!=", "terminada")
  );

  return from(getDocs(q).then(snapshot => {
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Comanda;
  }));
}



  actualizarComanda(comandaId: string, nuevosItems: any) {
    const comandaRef = doc(this.firestore, 'comandas', comandaId);

    return from(updateDoc(comandaRef, {
      itemsAlmuerzo: nuevosItems.itemsAlmuerzo,
      itemsEspeciales: nuevosItems.itemsEspeciales,
      itemsBebidas: nuevosItems.itemsBebidas,
      itemsAdicionales: nuevosItems.itemsAdicionales,
      total: nuevosItems.total,
      ultimaActualizacion: new Date()
    }));
  }

  obtenerComandasEnTiempoReal(): Observable<any[]> {
    const comandasCollection = collection(this.firestore, 'comandas');
    return new Observable(observer => {
      const unsubscribe = onSnapshot(comandasCollection, (snapshot) => {
        const comandas = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        observer.next(comandas);
      }, error => {
        observer.error(error);
      });
      return () => unsubscribe();
    });
  }
  async eliminarComanda(id: string) {
    const comandaRef = doc(this.firestore, `comandas/${id}`);
    await deleteDoc(comandaRef);
  }

  // En tu MenuService
  getAdicionales() {
    const adicionalesRef = doc(this.firestore, 'menus/adicionales');
    return docData(adicionalesRef);
  }

  setAdicionales(adicionales: any) {
    const adicionalesRef = doc(this.firestore, 'menus/adicionales');
    return setDoc(adicionalesRef, adicionales);
  }
}