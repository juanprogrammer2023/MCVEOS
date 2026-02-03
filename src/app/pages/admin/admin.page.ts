import { Component, OnInit, OnDestroy, ChangeDetectorRef,ViewChild,ElementRef,AfterViewInit } from "@angular/core";
import { environment } from "../../../environments/environment";
import { AlertController, ToastController, ModalController } from "@ionic/angular";
import {
  Firestore,
  doc,
  docData,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  Timestamp,
  Unsubscribe,
} from "@angular/fire/firestore";
import { AlmuerzoDelDia } from "../../models/almuerzo-del-dia.interface";
import { MenuService } from "../../services/menu.service";
import { Router } from "@angular/router";
import { ConfiguracionService } from "../../services/configuracion.service";
import { Subscription } from "rxjs";
import { ComandaDetalleModalComponent } from "../../components/comanda-detalle-modal/comanda-detalle-modal.component";


interface Comanda {
  id?: string
  numeroComanda: number
  fecha: Date | Timestamp
  mesa: string
  numeroMesa: number
  itemsAlmuerzo: any[]
  itemsEspeciales: any[]
  total: number
  estado: "pendiente" | "preparacion" | "lista" | "entregada" | "terminada" | "cancelada" // 👈 AGREGADO: "terminada"
  clienteId?: string
}

@Component({
  selector: "app-admin",
  templateUrl: "./admin.page.html",
  styleUrls: ["./admin.page.scss"],
  standalone: false,
})
export class AdminPage implements OnInit, OnDestroy {
  @ViewChild("menuContent", { static: false }) menuContent!: ElementRef
  @ViewChild("almuerzoContent", { static: false }) almuerzoContent!: ElementRef
  @ViewChild("especialContent", { static: false }) especialContent!: ElementRef
  @ViewChild("bebidasContent", { static: false }) bebidasContent!: ElementRef
  @ViewChild("adicionalesContent", { static: false }) adicionalesContent!: ElementRef
  @ViewChild("precioBaseInput", { static: false }) precioBaseInput!: ElementRef
  @ViewChild("especialNombreInput", { static: false }) especialNombreInput!: ElementRef
  @ViewChild("bebidaNombreInput", { static: false }) bebidaNombreInput!: ElementRef
  @ViewChild("adicionalNombreInput", { static: false }) adicionalNombreInput!: ElementRef
  
  selectedMenuTab = "almuerzo-dia"
  accessGranted = false
  firebaseData: any = null

  almuerzoDelDia: AlmuerzoDelDia = {
    proteinas: [],
    principios: [],
    jugos: [],
    sopas: [],
    valorBaseAlmuerzo: 0// 👈 agregado
  }

  nuevaProteina = ""
  nuevoPrincipio = ""
  nuevoJugo = ""
  nuevoAdicional: { nombre: string; precio: number } = { nombre: "", precio: 0 }
  nuevoAdicionalNombre = ""
  nuevoAdicionalPrecio: number | null = null
  nuevaSopa = ""
  almuerzosEspeciales: any[] = []
  nuevoEspecialNombre = ""
  nuevoEspecialPrecio: number | null = null
  numeroMesasDisponibles = 0



  // Primero, añade estas nuevas propiedades a tu clase AdminPage
  adicionales: any[] = [];
  nuevoAdicionalNombreIndependiente = "";
  nuevoAdicionalPrecioIndependiente: number | null = null;
  cargandoAdicionales = true;
  guardandoAdicionales = false;


  cargandoDatosMenu = true;
  cargandoEspeciales = true;
  cargandoBebidas = true;
  cargandoAlmuerzoDelDia = true;

  guardandoMesas = false;
  guardandoEspeciales = false;
  guardandoBebidas = false;
  guardandoAlmuerzoDelDia = false;

  bebidas: any[] = []
  nuevaBebidaNombre = ""
  nuevaBebidaPrecio: number | undefined = undefined
  nuevaBebidaCategoria = ""

  // Nuevas variables para tabs y comandas
  selectedTab = "menu"
  filtroComandas = "todas"
  comandas: Comanda[] = []
  comandasFiltradas: Comanda[] = []
  comandasSubscription: Subscription | null = null

  // Estadísticas
  totalComandasHoy = 0
  ventasHoy = 0
  comandasPendientes = 0
  comandasEnPreparacion = 0
  comandasListas = 0
  comandasTerminadas = 0 // 👈 AGREGADO: Nueva estadística
  comandasUnsubscribe: Unsubscribe | null = null

  constructor(
    private alertCtrl: AlertController,
    private firestore: Firestore,
    private menuService: MenuService,
    private router: Router,
    private toastController: ToastController,
    private configuracionService: ConfiguracionService,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef,
  ) { }

  async ngOnInit() {
    await this.askPassword()
    this.configuracionService.numeroMesas$.subscribe((numero) => {
      this.numeroMesasDisponibles = numero
    })
    this.suscribirseAComandas()
  }

  ngOnDestroy() {
    if (this.comandasSubscription) {
      this.comandasSubscription.unsubscribe()
    }
    if (this.comandasUnsubscribe) {
      this.comandasUnsubscribe()
      this.comandasUnsubscribe = null
    }
  }

  ngAfterViewInit() {
    // Initial focus setup
    this.setInitialFocus()
  }

  segmentChanged(event: any) {
    this.selectedTab = event.detail.value

    // Set focus after tab change with a small delay to ensure DOM is updated
    setTimeout(() => {
      this.focusOnTabContent()
    }, 150)
  }

  menuTabChanged(event: any) {

    this.selectedMenuTab = event.detail.value
    this.cdr.detectChanges()
    // Set focus after menu tab change with a small delay
    setTimeout(() => {
      this.focusOnMenuTabContent()
    }, 150)
  }

  private focusOnTabContent() {
    try {
      if (this.selectedTab === "menu" && this.menuContent) {
        this.menuContent.nativeElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
        this.menuContent.nativeElement.focus()
      }
    } catch (error) {
      console.log("Focus management: Tab content not ready yet")
    }
  }

  private focusOnMenuTabContent() {
    try {
      switch (this.selectedMenuTab) {
        case "almuerzo-dia":
          if (this.almuerzoContent) {
            this.almuerzoContent.nativeElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
            // Focus on the first input field
            setTimeout(() => {
              if (this.precioBaseInput) {
                this.precioBaseInput.nativeElement.setFocus()
              }
            }, 200)
          }
          break

        case "especial":
          if (this.especialContent) {
            this.especialContent.nativeElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
            setTimeout(() => {
              if (this.especialNombreInput) {
                this.especialNombreInput.nativeElement.setFocus()
              }
            }, 200)
          }
          break

        case "bebidas":
          if (this.bebidasContent) {
            this.bebidasContent.nativeElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
            setTimeout(() => {
              if (this.bebidaNombreInput) {
                this.bebidaNombreInput.nativeElement.setFocus()
              }
            }, 200)
          }
          break

        case "adicionales":
          if (this.adicionalesContent) {
            this.adicionalesContent.nativeElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
            setTimeout(() => {
              if (this.adicionalNombreInput) {
                this.adicionalNombreInput.nativeElement.setFocus()
              }
            }, 200)
          }
          break
      }
    } catch (error) {
      console.log("Focus management: Menu tab content not ready yet")
    }
  }

  private setInitialFocus() {
    setTimeout(() => {
      this.focusOnTabContent()
      if (this.selectedTab === "menu") {
        this.focusOnMenuTabContent()
      }
    }, 300)
  }

 

  // Método para cambiar entre tabs
  // segmentChanged(event: any) {
  //   this.selectedTab = event.detail.value
  //   // Ya no necesitamos suscribirnos aquí porque ya estamos suscritos desde ngOnInit
  //   if (this.selectedTab === "comandas") {
  //     // Solo actualizar estadísticas si es necesario
  //     this.actualizarEstadisticas()
  //   }
  // }

  // Método para filtrar comandas
  filtrarComandas(event: any) {
    this.filtroComandas = event.detail.value
    console.log("🔄 Filtro cambiado a:", this.filtroComandas)
    this.aplicarFiltroComandas()
  }

  getFechaComanda(fecha: Date | Timestamp): Date {
    if (fecha instanceof Date) {
      return fecha
    }
    // Si es un Timestamp de Firebase, convertirlo a Date
    return (fecha as any).toDate()
  }

  // Aplicar filtro a las comandas
  aplicarFiltroComandas() {
    console.log("🔍 Aplicando filtro:", this.filtroComandas)
    console.log("📊 Total comandas antes del filtro:", this.comandas.length)

    if (this.filtroComandas === "todas") {
      this.comandasFiltradas = [...this.comandas]
    } else {
      this.comandasFiltradas = this.comandas.filter((comanda) => comanda.estado === this.filtroComandas)
    }

    console.log("📋 Comandas después del filtro:", this.comandasFiltradas.length)

    // 👈 CLAVE: Forzar detección de cambios para que Angular actualice la vista
    this.cdr.detectChanges()
  }

  suscribirseAComandas() {
    // Si ya hay una suscripción activa, no crear otra
    if (this.comandasUnsubscribe) {
      return
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const comandasRef = collection(this.firestore, "comandas")
    const q = query(comandasRef, where("fecha", ">=", hoy))

    this.comandasUnsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log("🔥 Firebase snapshot recibido - Nuevos datos!")

      this.comandas = []
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Comanda
        // Convertir Timestamp a Date si es necesario
        if (data.fecha && typeof data.fecha !== "string") {
          const timestamp = data.fecha as unknown as Timestamp
          data.fecha = timestamp.toDate()
        }
        this.comandas.push({
          ...data,
          id: doc.id,
        } as any)
      })

      // Ordenar por fecha descendente (más reciente primero)
      this.comandas.sort((a, b) => {
        const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha as any)
        const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha as any)
        return fechaB.getTime() - fechaA.getTime()
      })

      // Aplicar filtro y actualizar estadísticas
      this.aplicarFiltroComandas() // 👈 Esto se ejecuta automáticamente
      this.actualizarEstadisticas()

      // 👈 CLAVE: Forzar detección de cambios después de recibir datos de Firebase
      this.cdr.detectChanges()
    })
  }

  // Actualizar estadísticas de comandas
  actualizarEstadisticas() {
    this.totalComandasHoy = this.comandas.length
    this.ventasHoy = this.comandas.reduce((total, comanda) => total + comanda.total, 0)
    this.comandasPendientes = this.comandas.filter((c) => c.estado === "pendiente").length
    this.comandasEnPreparacion = this.comandas.filter((c) => c.estado === "preparacion").length
    this.comandasListas = this.comandas.filter((c) => c.estado === "lista").length
    this.comandasTerminadas = this.comandas.filter((c) => c.estado === "terminada").length // 👈 AGREGADO
  }

  // Ver detalle de una comanda
  async verDetalleComanda(comanda: any) {
    const modal = await this.modalController.create({
      component: ComandaDetalleModalComponent,
      componentProps: {
        comanda: comanda,
      },
      cssClass: "comanda-detalle-modal",
    })

    return await modal.present()
  }

  // 👈 NUEVO: Método especial para terminar comanda y liberar mesa
  async terminarComanda(comanda: any) {
    const alert = await this.alertCtrl.create({
      header: "Terminar Comanda",
      message: `¿Confirmas que la comanda #${comanda.numeroComanda} está terminada? Esto liberará la mesa ${comanda.numeroMesa}.`,
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
        },
        {
          text: "Sí, terminar",
          handler: async () => {
            try {
              // 1. Actualizar estado de la comanda
              const comandaRef = doc(this.firestore, "comandas", comanda.id)
              await updateDoc(comandaRef, {
                estado: "terminada",
              })

              // 2. Liberar la mesa ocupada
              const mesaLiberada = await this.configuracionService.liberarMesaOcupada(
                comanda.numeroMesa,
                comanda.clienteId,
              )

              if (mesaLiberada) {
                const toast = await this.toastController.create({
                  message: `✅ Comanda #${comanda.numeroComanda} terminada y mesa ${comanda.numeroMesa} liberada`,
                  duration: 3000,
                  color: "success",
                })
                toast.present()
              } else {
                const toast = await this.toastController.create({
                  message: `⚠️ Comanda terminada pero no se pudo liberar la mesa ${comanda.numeroMesa}`,
                  duration: 3000,
                  color: "warning",
                })
                toast.present()
              }
            } catch (error) {
              console.error("Error al terminar comanda:", error)
              const toast = await this.toastController.create({
                message: "❌ Error al terminar la comanda",
                duration: 2000,
                color: "danger",
              })
              toast.present()
            }
          },
        },
      ],
    })

    await alert.present()
  }

  // 👈 MODIFICADO: Cambiar estado de una comanda
  async cambiarEstadoComanda(comanda: any, nuevoEstado: string) {
    // Manejar caso especial de "terminada"
    if (nuevoEstado === "terminada") {
      await this.terminarComanda(comanda)
      return
    }

    try {
      const comandaRef = doc(this.firestore, "comandas", comanda.id)
      await updateDoc(comandaRef, {
        estado: nuevoEstado,
      })

      const toast = await this.toastController.create({
        message: `Comanda #${comanda.numeroComanda} actualizada a ${this.getEstadoTexto(nuevoEstado)}`,
        duration: 2000,
        color: "success",
      })
      toast.present()
    } catch (error) {
      console.error("Error al actualizar comanda:", error)
      const toast = await this.toastController.create({
        message: "Error al actualizar el estado de la comanda",
        duration: 2000,
        color: "danger",
      })
      toast.present()
    }
  }

  // Cancelar una comanda
  async cancelarComanda(comanda: any) {
    const alert = await this.alertCtrl.create({
      header: "Confirmar cancelación",
      message: `¿Estás seguro de que deseas cancelar la comanda #${comanda.numeroComanda}? Esto liberará la mesa ${comanda.numeroMesa}.`,
      buttons: [
        {
          text: "No",
          role: "cancel",
        },
        {
          text: "Sí, cancelar",
          handler: async () => {
            try {
              // 1. Liberar la mesa ocupada
              const mesaLiberada = await this.configuracionService.liberarMesaOcupada(
                comanda.numeroMesa,
                comanda.clienteId,
              );

              // 2. Eliminar la comanda
              await this.menuService.eliminarComanda(comanda.id);

              // 3. Mostrar toast según resultado
              if (mesaLiberada) {
                const toast = await this.toastController.create({
                  message: `Comanda #${comanda.numeroComanda} cancelada y mesa ${comanda.numeroMesa} liberada`,
                  duration: 3000,
                  color: "warning",
                });
                toast.present();
              } else {
                const toast = await this.toastController.create({
                  message: `Comanda #${comanda.numeroComanda} cancelada pero no se pudo liberar la mesa ${comanda.numeroMesa}`,
                  duration: 3000,
                  color: "warning",
                });
                toast.present();
              }

            } catch (error) {
              console.error("Error al cancelar comanda:", error);
              const toast = await this.toastController.create({
                message: "Error al cancelar la comanda",
                duration: 2000,
                color: "danger",
              });
              toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }



  // 👈 MODIFICADO: Obtener el siguiente estado en el flujo de trabajo
  getNextEstado(estadoActual: string): string {
    switch (estadoActual) {
      case "pendiente":
        return "preparacion"
      case "preparacion":
        return "lista"
      case "lista":
        return "entregada"
      case "entregada":
        return "terminada" // 👈 AGREGADO: Nuevo flujo
      default:
        return estadoActual
    }
  }

  // 👈 MODIFICADO: Obtener texto legible del estado
  getEstadoTexto(estado: string): string {
    switch (estado) {
      case "pendiente":
        return "Pendiente"
      case "preparacion":
        return "En preparación"
      case "lista":
        return "Lista"
      case "entregada":
        return "Entregada"
      case "terminada":
        return "Terminada" // 👈 AGREGADO
      case "cancelada":
        return "Cancelada"
      default:
        return "Desconocido"
    }
  }

  // 👈 MODIFICADO: Obtener color del badge según estado
  getBadgeColor(estado: string): string {
    switch (estado) {
      case "pendiente":
        return "warning"
      case "preparacion":
        return "primary"
      case "lista":
        return "success"
      case "entregada":
        return "medium"
      case "terminada":
        return "dark" // 👈 AGREGADO: Color para terminada
      case "cancelada":
        return "danger"
      default:
        return "medium"
    }
  }

  async guardarConfiguracionMesas() {
    if (!this.numeroMesasDisponibles || this.numeroMesasDisponibles < 1) {
      const toast = await this.toastController.create({
        message: "Por favor ingresa un número válido de mesas",
        duration: 2000,
        color: "danger",
      });
      toast.present();
      return;
    }

    this.guardandoMesas = true; // ✅ Iniciar loading

    try {
      await this.configuracionService.actualizarNumeroMesas(this.numeroMesasDisponibles);

      const toast = await this.toastController.create({
        message: `Configuración guardada: ${this.numeroMesasDisponibles} mesas disponibles`,
        duration: 2000,
        color: "success",
      });
      toast.present();
    } catch (error) {
      console.error("Error al guardar configuración de mesas:", error);

      const toast = await this.toastController.create({
        message: "Error al guardar la configuración",
        duration: 2000,
        color: "danger",
      });
      toast.present();
    } finally {
      console.log("Guardado exitoso");
      this.guardandoMesas = false; // ✅ Terminar loading
      this.cdr.detectChanges(); // Forzar actualización de la vista
    }
  }

  agregarAlmuerzoEspecial() {
    console.log('🔄 Agregando almuerzo especial:', this.nuevoEspecialNombre, this.nuevoEspecialPrecio);
    this.cdr.detectChanges();
    if (this.nuevoEspecialNombre && this.nuevoEspecialPrecio != null) {
      this.almuerzosEspeciales.push({
        nombre: this.nuevoEspecialNombre,
        precio: this.nuevoEspecialPrecio,
      });

      console.log('✅ Almuerzo agregado. Total:', this.almuerzosEspeciales.length);

      this.nuevoEspecialNombre = "";
      this.nuevoEspecialPrecio = null;

      // ✅ AGREGAR ESTA LÍNEA
      this.cdr.detectChanges();
    }
  }

  eliminarAlmuerzoEspecial(index: number) {
    this.almuerzosEspeciales.splice(index, 1)
    this.cdr.detectChanges();
  }

  async guardarAlmuerzosEspeciales() {

    this.guardandoEspeciales = true


    try {
      await this.menuService.setAlmuerzosEspeciales({ especiales: this.almuerzosEspeciales })
      const alert = await this.alertCtrl.create({
        header: "Éxito",
        message: "✅ Almuerzos especiales guardados correctamente",
        buttons: ["OK"],
      })
      await alert.present()
    } catch (error) {
      console.error("❌ Error guardando almuerzos especiales:", error)
      const alert = await this.alertCtrl.create({
        header: "Error",
        message: "Hubo un error guardando los almuerzos especiales.",
        buttons: ["OK"],
      })
      await alert.present()
    }
    finally {
      this.guardandoEspeciales = false; // ✅ Terminar loading
      this.cdr.detectChanges(); // Forzar actualización de la vista
    }
  }

  async askPassword() {
    const alert = await this.alertCtrl.create({
      header: "Contraseña requerida",
      inputs: [
        {
          name: "password",
          type: "password",
          placeholder: "Ingrese la contraseña",
        },
      ],
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          handler: () => {
            this.accessGranted = false
          },
        },
        {
          text: "Entrar",
          handler: async (data) => {
            if (data.password === environment.adminPassword) {
              this.accessGranted = true
              await this.testFirebaseConnection()
            } else {
              this.accessGranted = false
              this.presentIncorrectPasswordAlert()
              this.askPassword()
            }
          },
        },
      ],
      backdropDismiss: false,
    })

    await alert.present()
  }

  // Agregar nueva bebida a la lista temporal
  agregarBebida() {
    console.log('🔄 Agregando bebida:', this.nuevaBebidaNombre, this.nuevaBebidaCategoria, this.nuevaBebidaPrecio);
    this.cdr.detectChanges();
    if (this.nuevaBebidaNombre.trim() && this.nuevaBebidaPrecio != null && this.nuevaBebidaCategoria.trim()) {
      this.bebidas.push({
        nombre: this.nuevaBebidaNombre.trim(),
        precio: this.nuevaBebidaPrecio,
        categoria: this.nuevaBebidaCategoria.trim()
      });

      console.log('✅ Bebida agregada. Total:', this.bebidas.length);

      // Limpiar los campos
      this.nuevaBebidaNombre = "";
      this.nuevaBebidaPrecio = undefined;
      this.nuevaBebidaCategoria = "";

      // ✅ AGREGAR ESTA LÍNEA
      this.cdr.detectChanges();
    }
  }

  // Eliminar bebida de la lista
  eliminarBebida(index: number) {
    this.bebidas.splice(index, 1);
    this.cdr.detectChanges();
  }

  // Guardar todas las bebidas en Firebase
  async guardarBebidas() {
    this.guardandoBebidas = true; // ✅ Iniciar loading
    try {
      await this.menuService.setBebidas({ bebidas: this.bebidas });
      const alert = await this.alertCtrl.create({
        header: 'Éxito',
        message: '✅ Bebidas guardadas correctamente',
        buttons: ['OK'],
      });
      await alert.present();
    } catch (error) {
      console.error('❌ Error guardando bebidas:', error);
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Hubo un error guardando las bebidas.',
        buttons: ['OK'],
      });
      await alert.present();
    }
    finally {
      this.guardandoBebidas = false; // ✅ Terminar loading
      this.cdr.detectChanges(); // Forzar actualización de la vista
    }
  }

  // Obtener categorías únicas (opcional, para estadísticas)
  getCategoriasUnicas(): string[] {
    const categorias = this.bebidas.map(bebida => bebida.categoria);
    return [...new Set(categorias)].sort();
  }

  // Contar bebidas por categoría (opcional, para estadísticas)
  getBebidasPorCategoria(categoria: string): number {
    return this.bebidas.filter(bebida => bebida.categoria === categoria).length;
  }

  agregarSopa() {
    this.cdr.detectChanges();
    if (this.nuevaSopa.trim()) {
      this.almuerzoDelDia.sopas.push(this.nuevaSopa.trim())
      this.nuevaSopa = ""
    }
    this.cdr.detectChanges();
  }

  eliminarSopa(index: number) {
    this.almuerzoDelDia.sopas.splice(index, 1)
    this.cdr.detectChanges();
  }

  // Agregar Principio
  agregarPrincipio() {
    this.cdr.detectChanges();
    if (this.nuevoPrincipio.trim()) {
      this.almuerzoDelDia.principios.push(this.nuevoPrincipio.trim())
      this.nuevoPrincipio = ""
    }
    this.cdr.detectChanges();
  }

  // Eliminar Principio
  eliminarPrincipio(index: number) {
    this.almuerzoDelDia.principios.splice(index, 1)
    this.cdr.detectChanges();
  }

  // Agregar Jugo
  agregarJugo() {
    this.cdr.detectChanges();
    if (this.nuevoJugo.trim()) {
      this.almuerzoDelDia.jugos.push(this.nuevoJugo.trim())
      this.nuevoJugo = ""
    }
    this.cdr.detectChanges();
  }

  // Eliminar Jugo
  eliminarJugo(index: number) {
    this.almuerzoDelDia.jugos.splice(index, 1)
    this.cdr.detectChanges();
  }

  agregarProteina() {
    this.cdr.detectChanges();
    if (this.nuevaProteina.trim()) {
      this.almuerzoDelDia.proteinas.push(this.nuevaProteina.trim());
      this.nuevaProteina = "";
      // ✅ AGREGAR ESTA LÍNEA
      this.cdr.detectChanges();
    }
  }

  eliminarProteina(index: number) {
    this.almuerzoDelDia.proteinas.splice(index, 1)
    this.cdr.detectChanges();
  }

  async presentIncorrectPasswordAlert() {
    const alert = await this.alertCtrl.create({
      header: "Error",
      message: "Contraseña incorrecta",
      buttons: ["OK"],
    })
    await alert.present()
  }

  // ✅ MODIFICADO: Conexión a Firebase con loading states
  async testFirebaseConnection() {
    const docRef = doc(this.firestore, "test/firebase")

    docData(docRef).subscribe({
      next: (data) => {
        console.log("✅ Conexión exitosa con Firebase:", data)
        this.firebaseData = data

        // En el método testFirebaseConnection
        this.menuService.getAdicionales().subscribe((data) => {
          if (data && data['adicionales']) {
            this.adicionales = data['adicionales'];
          } else {
            this.adicionales = [];
          }
          this.cargandoAdicionales = false;
          this.verificarCargaCompleta();
        });

        // ✅ Cargar almuerzo del día con loading
        this.menuService.getAlmuerzoDelDia().subscribe((data) => {
          if (data) {
            this.almuerzoDelDia = {
              ...data,
              valorBaseAlmuerzo: data.valorBaseAlmuerzo || 0
            }
          }
          this.cargandoAlmuerzoDelDia = false
          this.verificarCargaCompleta()
        })


        // ✅ Cargar almuerzos especiales con loading
        this.menuService.getAlmuerzosEspeciales().subscribe((data) => {
          if (data && data.especiales) {
            this.almuerzosEspeciales = data.especiales
          } else {
            this.almuerzosEspeciales = []
          }
          this.cargandoEspeciales = false; // ✅ Terminar loading
          this.verificarCargaCompleta();
        })

        // ✅ Cargar bebidas con loading
        this.menuService.getBebidas().subscribe((data) => {
          if (data && data.bebidas) {
            this.bebidas = data.bebidas;
          } else {
            this.bebidas = [];
          }
          this.cargandoBebidas = false; // ✅ Terminar loading
          this.verificarCargaCompleta();
        });
      },
      error: (error) => {
        console.error("❌ Error de conexión con Firebase:", error)
        // ✅ En caso de error, terminar todos los loadings
        this.cargandoDatosMenu = false;
        this.cargandoEspeciales = false;
        this.cargandoBebidas = false;
        this.cargandoAlmuerzoDelDia = false;
      },
    })
  }

  verificarCargaCompleta() {
    if (!this.cargandoEspeciales && !this.cargandoBebidas && !this.cargandoAlmuerzoDelDia && !this.cargandoAdicionales) {
      this.cargandoDatosMenu = false;
      this.cdr.detectChanges();
    }
  }

  async guardarAlmuerzoDelDia() {
  this.guardandoAlmuerzoDelDia = true
  try {
    await this.menuService.setAlmuerzoDelDia(this.almuerzoDelDia) // 👈 guarda todo con precio incluido
    const alert = await this.alertCtrl.create({
      header: "Éxito",
      message: "✅ Almuerzo del día guardado correctamente",
      buttons: ["OK"],
    })
    await alert.present()
  } catch (error) {
    console.error("❌ Error guardando almuerzo del día:", error)
    const alert = await this.alertCtrl.create({
      header: "Error",
      message: "Hubo un error guardando los datos.",
      buttons: ["OK"],
    })
    await alert.present()
  } finally {
    this.guardandoAlmuerzoDelDia = false
    this.cdr.detectChanges()
  }
}


  // Agregar nuevo adicional independiente
  agregarAdicionalIndependiente() {
    console.log('🔄 Agregando adicional independiente:', this.nuevoAdicionalNombreIndependiente, this.nuevoAdicionalPrecioIndependiente);
    this.cdr.detectChanges();
    if (this.nuevoAdicionalNombreIndependiente.trim() && this.nuevoAdicionalPrecioIndependiente != null) {
      this.adicionales.push({
        nombre: this.nuevoAdicionalNombreIndependiente.trim(),
        precio: this.nuevoAdicionalPrecioIndependiente,
      });
    } else {
      alert('⚠️ Por favor ingresa un nombre y precio válidos para el adicional.');
    }
    // 
    this.nuevoAdicionalNombreIndependiente = "";
    this.nuevoAdicionalPrecioIndependiente = null;


    this.cdr.detectChanges();

  }

  // Eliminar adicional independiente
  eliminarAdicionalIndependiente(index: number) {
    this.adicionales.splice(index, 1);
    this.cdr.detectChanges();
  }

  // Guardar adicionales en Firebase
  async guardarAdicionalesIndependientes() {
    this.guardandoAdicionales = true;
    try {
      // Necesitarás crear este método en tu MenuService
      await this.menuService.setAdicionales({ adicionales: this.adicionales });
      const alert = await this.alertCtrl.create({
        header: 'Éxito',
        message: '✅ Adicionales guardados correctamente',
        buttons: ['OK'],
      });
      await alert.present();
    } catch (error) {
      console.error('❌ Error guardando adicionales:', error);
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Hubo un error guardando los adicionales.',
        buttons: ['OK'],
      });
      await alert.present();
    } finally {
      this.guardandoAdicionales = false;
      this.cdr.detectChanges();
    }
  }

  irAClient() {
    this.router.navigate(["/mesas"])
  }
}
