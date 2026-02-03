import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core"
import { FormBuilder, FormGroup, Validators, FormControl } from "@angular/forms"
import { ToastController, LoadingController, IonContent } from "@ionic/angular"
import { Router } from "@angular/router"
import { MenuService } from '../../services/menu.service'
import { ConfiguracionService, Mesa, ConfiguracionMesas } from '../../services/configuracion.service'
import { Subscription } from 'rxjs'
import { Comanda } from "src/app/models/comanda.interface"
import { take } from 'rxjs/operators';


interface ItemComanda {
  id: string;
  proteina: string;
  principio: string;
  sopa: string;
  jugo: string;
  arroz: string; // ✅ AÑADIR ESTA LÍNEA
  valorUnitario: number;
  valorTotal: number;
}

interface ItemEspecial {
  id: string;
  plato: string;
  cantidad: number;
  precioUnitario: number;
  valorTotal: number;
}

interface ItemBebida {
  id: string;
  bebida: string;
  categoria: string;
  cantidad: number;
  precioUnitario: number;
  valorTotal: number;
}

interface ItemAdicional {
  id: string;
  adicional: string;
  cantidad: number;
  precioUnitario: number;
  valorTotal: number;
}

export type TipoItem = "almuerzo" | "especial" | "bebidas" | "adicionales";

@Component({
  selector: 'app-mesas',
  templateUrl: './mesas.page.html',
  styleUrls: ['./mesas.page.scss'],
  standalone: false
})
export class MesasPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;
  almuerzoDelDia: any;
  today: Date = new Date();
  numeroComanda: number = Math.floor(1000 + Math.random() * 9000);
  itemsAlmuerzo: ItemComanda[] = [];
  itemsEspeciales: ItemEspecial[] = [];
  itemsBebidas: ItemBebida[] = [];
  itemsAdicionales: ItemAdicional[] = [];
  tipoActual: TipoItem = "almuerzo";
  itemForm: FormGroup;
  private formSubscription: Subscription | null = null;
  private primeraVez: boolean = true;

  // Propiedades para bebidas
  bebidasDisponibles: any[] = [];
  bebidasFiltradas: any[] = [];
  categoriasDisponibles: string[] = [];
  categoriaSeleccionada: string = '';

  // Propiedades para adicionales independientes
  adicionalesDisponibles: any[] = [];

  // Propiedades para mesas
  mesasDisponibles: Mesa[] = [];
  mesaSeleccionada: number | null = null;
  numeroTotalMesas: number = 0;
  cargandoMesas: boolean = true;
  private configuracionSubscription: Subscription | null = null;

  valorBaseAlmuerzo: number = 0;
  especialesDelDia: { nombre: string; precio: number }[] = [];

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
    private menuService: MenuService,
    private configuracionService: ConfiguracionService,
  ) {
    this.itemForm = this.createAlmuerzoForm();
    this.subscribeToFormChanges();
  }

  ngOnInit() {
    // Asegurar que el loading esté activo al inicio
    this.cargandoMesas = true;
    this.primeraVez = true;

    // Suscribirse a los cambios de configuración de mesas
    this.configuracionSubscription = this.configuracionService.configuracionMesas$.subscribe(
      (configuracion: ConfiguracionMesas) => {
        console.log('Configuración recibida:', configuracion);

        // Solo actualizar si es la primera vez o si hay cambios reales
        if (this.primeraVez || this.numeroTotalMesas !== configuracion.numeroMesas) {
          this.numeroTotalMesas = configuracion.numeroMesas;
          this.mesasDisponibles = configuracion.mesasDisponibles;

          // Solo desactivar loading después de recibir datos válidos
          if (configuracion.numeroMesas > 0 || !this.primeraVez) {
            this.cargandoMesas = false;
            this.primeraVez = false;
          }
        } else {
          // Para actualizaciones posteriores, solo actualizar las mesas
          this.mesasDisponibles = configuracion.mesasDisponibles;
        }

        // Verificar si la mesa seleccionada sigue disponible
        if (this.mesaSeleccionada) {
          const mesaSeleccionadaDisponible = this.mesasDisponibles.find(
            mesa => mesa.numero === this.mesaSeleccionada && mesa.disponible
          );
          if (!mesaSeleccionadaDisponible) {
            this.mesaSeleccionada = null;
            this.mostrarToast("La mesa seleccionada ya no está disponible", "warning");
          }
        }
      },
      (error) => {
        console.error('Error al cargar configuración de mesas:', error);
        this.cargandoMesas = false;
        this.mostrarToast('Error al cargar las mesas', 'danger');
      }
    );

    // Cargar datos del menú
    this.menuService.getAlmuerzoDelDia().subscribe(data => {
      if (data) {
        this.almuerzoDelDia = data;
        this.valorBaseAlmuerzo = data.valorBaseAlmuerzo; // debería asignar 14000

        this.itemForm.patchValue({
          valorUnitario: this.valorBaseAlmuerzo,
          valorTotal: this.valorBaseAlmuerzo
        }, { emitEvent: false });
        console.log("almuerzoDelDia", this.almuerzoDelDia);
      }
    });


    this.menuService.getAlmuerzosEspeciales().subscribe(data => {
      this.especialesDelDia = data.especiales || [];
    });

    this.cargarBebidas();
    this.cargarAdicionales();
  }

  private enfocarComandaActiva() {
    setTimeout(() => {
      const target = document.getElementById('comanda-activa');
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: "center", // lo alinea al centro
        });
      }
    }, 500); // aumentamos el delay para asegurar render
  }

  cambiarCantidadBebida(item: ItemBebida, delta: number) {
    const index = this.itemsBebidas.findIndex(i => i.id === item.id);
    if (index === -1) return;

    const nuevaCantidad = this.itemsBebidas[index].cantidad + delta;
    if (nuevaCantidad < 1) return;

    this.itemsBebidas[index].cantidad = nuevaCantidad;
    this.itemsBebidas[index].valorTotal = this.itemsBebidas[index].precioUnitario * nuevaCantidad;

    this.itemsBebidas = [...this.itemsBebidas];
  }

  cambiarCantidadEspecial(item: ItemEspecial, delta: number) {
    const index = this.itemsEspeciales.findIndex(i => i.id === item.id);
    if (index === -1) return;

    const nuevaCantidad = this.itemsEspeciales[index].cantidad + delta;
    if (nuevaCantidad < 1) return;

    this.itemsEspeciales[index].cantidad = nuevaCantidad;
    this.itemsEspeciales[index].valorTotal = this.itemsEspeciales[index].precioUnitario * nuevaCantidad;

    this.itemsEspeciales = [...this.itemsEspeciales];
  }

  cambiarCantidadAdicional(item: ItemAdicional, delta: number) {
    const index = this.itemsAdicionales.findIndex(i => i.id === item.id);
    if (index === -1) return;

    const nuevaCantidad = this.itemsAdicionales[index].cantidad + delta;
    if (nuevaCantidad < 1) return;

    this.itemsAdicionales[index].cantidad = nuevaCantidad;
    this.itemsAdicionales[index].valorTotal = this.itemsAdicionales[index].precioUnitario * nuevaCantidad;

    this.itemsAdicionales = [...this.itemsAdicionales];
  }


  // Método alternativo si quieres forzar una recarga
  async recargarMesas() {
    this.cargandoMesas = true;
    this.primeraVez = true;

    try {
      setTimeout(() => {
        if (this.cargandoMesas) {
          this.cargandoMesas = false;
          this.mostrarToast('No se pudieron cargar las mesas', 'warning');
        }
      }, 5000); // Timeout de 5 segundos

    } catch (error) {
      this.cargandoMesas = false;
      this.mostrarToast('Error al recargar las mesas', 'danger');
    }
  }

  ngOnDestroy() {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
    if (this.configuracionSubscription) {
      this.configuracionSubscription.unsubscribe();
    }
  }

  seleccionarMesa(mesa: Mesa) {
    if (mesa.disponible) {
      // Limpiar datos de una posible comanda anterior
      this.mesaSeleccionada = mesa.numero;
      this.numeroComanda = Math.floor(1000 + Math.random() * 9000); // generar nueva
      this.itemsAlmuerzo = [];
      this.itemsEspeciales = [];
      this.itemsBebidas = [];
      this.itemsAdicionales = [];

      this.mostrarToast(`Mesa ${mesa.numero} seleccionada (nueva comanda)`, "success");
    } else {
      // Cargar la comanda activa de esa mesa
      this.menuService.getComandaActivaPorMesa(mesa.numero).subscribe((comanda) => {
        if (comanda) {
          console.log("Comanda activa encontrada:", comanda);

          this.itemsEspeciales = comanda.itemsEspeciales ?? [];
          this.itemsAlmuerzo = comanda.itemsAlmuerzo ?? [];
          this.itemsBebidas = comanda.itemsBebidas ?? [];
          this.itemsAdicionales = comanda.itemsAdicionales ?? [];

          this.mesaSeleccionada = mesa.numero;
          this.numeroComanda = comanda.numeroComanda; // usar la misma para actualizar

          this.mostrarToast(
            `La mesa ${mesa.numero} está ocupada con la comanda #${comanda.numeroComanda}`,
            "warning"
          );

          // 👇 desplazarse a la sección de la comanda activa
          this.enfocarComandaActiva();

        } else {
          this.mostrarToast(
            `La mesa ${mesa.numero} está ocupada pero no se encontró comanda activa`,
            "danger"
          );
        }
      });
    }
  }



  // ========== MÉTODOS PARA BEBIDAS ==========
  cargarBebidas() {
    this.menuService.getBebidas().subscribe((data) => {
      if (data && data.bebidas) {
        this.bebidasDisponibles = data.bebidas;
        this.categoriasDisponibles = this.obtenerCategoriasUnicas();
        this.bebidasFiltradas = [...this.bebidasDisponibles];
        console.log("categoriasDisponibles", this.categoriasDisponibles);
      } else {
        this.bebidasDisponibles = [];
        this.categoriasDisponibles = [];
        this.bebidasFiltradas = [];
      }
    });
  }

  // ========== MÉTODOS PARA ADICIONALES ==========
  cargarAdicionales() {
    this.menuService.getAdicionales().subscribe((data) => {
      if (data && data['adicionales']) {
        this.adicionalesDisponibles = data['adicionales'];
        console.log("adicionalesDisponibles", this.adicionalesDisponibles);
      } else {
        this.adicionalesDisponibles = [];
      }
    });
  }

  obtenerCategoriasUnicas(): string[] {
    const categorias = this.bebidasDisponibles.map(bebida => bebida.categoria);
    return [...new Set(categorias)].sort();
  }

  filtrarBebidasPorCategoria() {
    console.log(this.categoriaSeleccionada || null);
    if (this.categoriaSeleccionada) {
      this.bebidasFiltradas = this.bebidasDisponibles.filter(
        bebida => bebida.categoria === this.categoriaSeleccionada
      );
    } else {
      this.bebidasFiltradas = [...this.bebidasDisponibles];
    }

    this.itemForm.patchValue({ bebida: null }, { emitEvent: false });
    this.calcularValorTotalBebida();
  }

  calcularValorTotalBebida() {
    const bebidaSeleccionada = this.itemForm.get('bebida')?.value;
    const cantidad = this.itemForm.get('cantidad')?.value || 1;

    if (bebidaSeleccionada) {
      const bebida = this.bebidasDisponibles.find(b => b.nombre === bebidaSeleccionada);
      if (bebida) {
        const valorTotal = bebida.precio * cantidad;
        this.itemForm.patchValue({ valorTotal: valorTotal }, { emitEvent: false });
      }
    } else {
      this.itemForm.patchValue({ valorTotal: 0 }, { emitEvent: false });
    }
  }

  calcularValorTotalAdicional() {
    const adicionalSeleccionado = this.itemForm.get('adicional')?.value;
    const cantidad = this.itemForm.get('cantidad')?.value || 1;

    if (adicionalSeleccionado) {
      const adicional = this.adicionalesDisponibles.find(a => a.nombre === adicionalSeleccionado);
      if (adicional) {
        const valorTotal = adicional.precio * cantidad;
        this.itemForm.patchValue({ valorTotal: valorTotal }, { emitEvent: false });
      }
    } else {
      this.itemForm.patchValue({ valorTotal: 0 }, { emitEvent: false });
    }
  }

  // ========== MÉTODOS PARA FORMULARIOS ==========
  private subscribeToFormChanges() {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }

    this.formSubscription = this.itemForm.valueChanges.subscribe(() => {
      if (this.tipoActual === 'almuerzo') {
        this.calcularValor();
      } else if (this.tipoActual === 'especial') {
        this.calcularValorEspecial();
      } else if (this.tipoActual === 'bebidas') {
        this.calcularValorTotalBebida();
      } else if (this.tipoActual === 'adicionales') {
        this.calcularValorTotalAdicional();
      }
    });
  }

  private createAlmuerzoForm(): FormGroup {
    return this.fb.group({
      cantidad: [1, [Validators.required, Validators.min(1)]],
      proteina: ['', Validators.required],
      principio: [''],
      sopa: [''],
      adicional: [[]],
      jugo: [''],
      arroz: ['Sí'],
      valorUnitario: [this.valorBaseAlmuerzo],
      valorTotal: [this.valorBaseAlmuerzo]
    });
  }

  private createEspecialForm(): FormGroup {
    return this.fb.group({
      platoEspecial: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      valorTotal: [0]
    });
  }


  private createBebidasForm(): FormGroup {
    return this.fb.group({
      bebida: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      valorTotal: [0]
    });
  }

  private createAdicionalesForm(): FormGroup {
    return this.fb.group({
      adicional: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      valorTotal: [0]
    });
  }

  cambiarTipoForm() {
    if (this.tipoActual === 'almuerzo') {
      this.itemForm = this.createAlmuerzoForm();
    } else if (this.tipoActual === 'especial') {
      this.itemForm = this.createEspecialForm();
    } else if (this.tipoActual === 'bebidas') {
      this.itemForm = this.createBebidasForm();
      this.categoriaSeleccionada = '';
      this.bebidasFiltradas = [...this.bebidasDisponibles];
    } else if (this.tipoActual === 'adicionales') {
      this.itemForm = this.createAdicionalesForm();
    }
    this.subscribeToFormChanges();
  }

  calcularValor() {
    const cantidad = this.itemForm.get("cantidad")?.value || 1;
    const adicionalesSeleccionados: string[] = this.itemForm.get("adicional")?.value || [];

    let adicionalesPrecio = 0;

    if (this.almuerzoDelDia?.adicionales) {
      for (const nombreAdicional of adicionalesSeleccionados) {
        const adicionalObj = this.almuerzoDelDia.adicionales.find((a: any) => a.nombre === nombreAdicional);
        if (adicionalObj) {
          adicionalesPrecio += adicionalObj.precio;
        }
      }
    }

    const valorUnitario = this.valorBaseAlmuerzo + adicionalesPrecio;
    const valorTotal = valorUnitario * cantidad;

    this.itemForm.patchValue({
      valorUnitario,
      valorTotal
    }, { emitEvent: false });
  }

  calcularValorEspecial() {
    const platoSeleccionado = this.itemForm.get('platoEspecial')?.value;
    const cantidad = this.itemForm.get('cantidad')?.value || 1;

    if (platoSeleccionado) {
      const plato = this.especialesDelDia.find(e => e.nombre === platoSeleccionado);
      if (plato) {
        const valorTotal = plato.precio * cantidad;
        this.itemForm.patchValue({
          valorTotal: valorTotal
        }, { emitEvent: false });
      }
    } else {
      this.itemForm.patchValue({
        valorTotal: 0
      }, { emitEvent: false });
    }
  }


  // ========== MÉTODOS PARA AGREGAR/ELIMINAR ITEMS ==========
  async agregarItem() {
    if (this.itemForm.invalid) {
      if (this.tipoActual === 'almuerzo' && !this.itemForm.get("proteina")?.value) {
        this.mostrarToast("Debes seleccionar al menos una proteína", "danger");
      } else if (this.tipoActual === 'especial' && !this.itemForm.get("platoEspecial")?.value) {
        this.mostrarToast("Debes seleccionar un plato especial", "danger");
      } else if (this.tipoActual === 'bebidas' && !this.itemForm.get("bebida")?.value) {
        this.mostrarToast("Debes seleccionar una bebida", "danger");
      } else if (this.tipoActual === 'adicionales' && !this.itemForm.get("adicional")?.value) {
        this.mostrarToast("Debes seleccionar un adicional", "danger");
      } else {
        this.mostrarToast("Por favor completa correctamente el formulario", "danger");
      }
      return;
    }

    if (this.tipoActual === 'almuerzo') {
      const nuevoItemCompleto: ItemComanda = {
        id: Date.now().toString(),
        proteina: this.itemForm.get("proteina")?.value,
        principio: this.itemForm.get("principio")?.value,
        sopa: this.itemForm.get("sopa")?.value,
        jugo: this.itemForm.get("jugo")?.value,
        arroz: this.itemForm.get("arroz")?.value,
        valorUnitario: this.itemForm.get("valorUnitario")?.value,
        valorTotal: this.itemForm.get("valorTotal")?.value
      };
      this.itemsAlmuerzo = [...this.itemsAlmuerzo, nuevoItemCompleto];
      this.itemForm = this.createAlmuerzoForm();

    } else if (this.tipoActual === 'especial') {
      const platoSeleccionado = this.itemForm.get("platoEspecial")?.value;
      const cantidad = this.itemForm.get("cantidad")?.value;
      const valorTotal = this.itemForm.get("valorTotal")?.value;

      const platoInfo = this.especialesDelDia.find(e => e.nombre === platoSeleccionado);

      const nuevoItemEspecial: ItemEspecial = {
        id: Date.now().toString(),
        plato: platoSeleccionado,
        cantidad: cantidad,
        precioUnitario: platoInfo?.precio || 0,
        valorTotal: valorTotal
      };
      this.itemsEspeciales = [...this.itemsEspeciales, nuevoItemEspecial];
      this.itemForm = this.createEspecialForm();
    }
    else if (this.tipoActual === 'bebidas') {
      const bebidaSeleccionada = this.itemForm.get("bebida")?.value;
      const cantidad = this.itemForm.get("cantidad")?.value;
      const valorTotal = this.itemForm.get("valorTotal")?.value;

      const bebidaInfo = this.bebidasDisponibles.find(b => b.nombre === bebidaSeleccionada);

      const nuevoItemBebida: ItemBebida = {
        id: Date.now().toString(),
        bebida: bebidaSeleccionada,
        categoria: bebidaInfo?.categoria || '',
        cantidad: cantidad,
        precioUnitario: bebidaInfo?.precio || 0,
        valorTotal: valorTotal
      };
      this.itemsBebidas = [...this.itemsBebidas, nuevoItemBebida];
      this.itemForm = this.createBebidasForm();
      this.categoriaSeleccionada = '';
      this.bebidasFiltradas = [...this.bebidasDisponibles];

    } else if (this.tipoActual === 'adicionales') {
      const adicionalSeleccionado = this.itemForm.get("adicional")?.value;
      const cantidad = this.itemForm.get("cantidad")?.value;
      const valorTotal = this.itemForm.get("valorTotal")?.value;

      const adicionalInfo = this.adicionalesDisponibles.find(a => a.nombre === adicionalSeleccionado);

      const nuevoItemAdicional: ItemAdicional = {
        id: Date.now().toString(),
        adicional: adicionalSeleccionado,
        cantidad: cantidad,
        precioUnitario: adicionalInfo?.precio || 0,
        valorTotal: valorTotal
      };
      this.itemsAdicionales = [...this.itemsAdicionales, nuevoItemAdicional];
      this.itemForm = this.createAdicionalesForm();
    }

    this.subscribeToFormChanges();
    this.mostrarToast(`Se agregó nuevo item a la comanda`, "success");
  }

  eliminarItem(id: string, tipo: TipoItem) {
    if (tipo === "almuerzo") {
      this.itemsAlmuerzo = this.itemsAlmuerzo.filter(item => item.id !== id);
    } else if (tipo === "especial") {
      this.itemsEspeciales = this.itemsEspeciales.filter(item => item.id !== id);
    } else if (tipo === "bebidas") {
      this.itemsBebidas = this.itemsBebidas.filter(item => item.id !== id);
    } else if (tipo === "adicionales") {
      this.itemsAdicionales = this.itemsAdicionales.filter(item => item.id !== id);
    }
    this.mostrarToast("El ítem ha sido eliminado de la comanda", "success");
  }



  // ========== MÉTODOS PARA ENVIAR COMANDA ==========


  async enviarACocinero() {
    if (
      this.itemsAlmuerzo.length === 0 &&
      this.itemsEspeciales.length === 0 &&
      this.itemsBebidas.length === 0 &&
      this.itemsAdicionales.length === 0
    ) {
      this.mostrarToast("No hay ítems en la comanda para enviar", "danger")
      return
    }

    if (!this.mesaSeleccionada) {
      this.mostrarToast("Debes seleccionar una mesa antes de enviar la comanda", "danger")
      return
    }

    const mesaParaReservar = this.mesaSeleccionada

    const loading = await this.loadingController.create({
      message: "Procesando pedido...",
    })
    await loading.present()

    try {
      const comanda = {
        numeroComanda: this.numeroComanda,
        fecha: new Date(),
        itemsAlmuerzo: this.itemsAlmuerzo,
        itemsEspeciales: this.itemsEspeciales,
        itemsBebidas: this.itemsBebidas,
        itemsAdicionales: this.itemsAdicionales,
        total: this.calcularTotal(),
        estado: "pendiente",
        mesa: `Mesa ${mesaParaReservar}`,
        numeroMesa: mesaParaReservar,
        clienteId: `comanda_${this.numeroComanda}`,
      }

      loading.message = "Enviando comanda..."

      this.menuService
        .getComandaActivaPorMesa(mesaParaReservar)
        .pipe(take(1))
        .subscribe(async (comandaActiva: any) => {
          if (comandaActiva && comandaActiva.id) {
            if (this.comandasIguales(comanda, comandaActiva)) {
              loading.dismiss()
              this.mostrarToast("No hay cambios en la comanda para actualizar", "warning")
              return
            }

            // Actualizar comanda existente solo si hay cambios
            console.log("Actualizando comanda existente con cambios:", comandaActiva)
            this.menuService.actualizarComanda(comandaActiva.id, comanda).subscribe({
              next: () => {
                loading.dismiss()
                this.mostrarToast(
                  `Comanda #${this.numeroComanda} actualizada correctamente para Mesa ${mesaParaReservar}`,
                  "success",
                )

                // Reiniciar comanda también al actualizar
                this.reiniciarComanda()
              },
              error: (error: any) => {
                loading.dismiss()
                console.error("Error al actualizar comanda:", error)
                this.mostrarToast("Error al actualizar la comanda", "danger")
              },
            })
          } else {
            // Crear nueva comanda y reservar mesa
            const clienteId = `comanda_${this.numeroComanda}`
            const mesaReservada = await this.configuracionService.reservarMesa(mesaParaReservar, clienteId, true)

            if (!mesaReservada) {
              loading.dismiss()
              this.mostrarToast("Error al reservar la mesa. Intente nuevamente.", "danger")
              return
            }

            this.menuService.crearComanda(comanda).subscribe({
              next: (resultado: any) => {
                loading.dismiss()
                this.mostrarToast(
                  `Comanda #${this.numeroComanda} enviada a cocina correctamente para Mesa ${mesaParaReservar}`,
                  "success",
                )

                // Reiniciar comanda
                this.reiniciarComanda()
                console.log("Comanda creada exitosamente:", resultado)
              },
              error: (error: any) => {
                loading.dismiss()
                console.error("Error al guardar la comanda:", error)
                this.mostrarToast("Error al enviar la comanda. Intente nuevamente.", "danger")

                // liberar mesa si falló guardar la comanda
                this.configuracionService.liberarMesaReservada(mesaParaReservar, clienteId)
              },
            })
          }
        })
    } catch (error) {
      loading.dismiss()
      console.error("Error en el proceso:", error)
      this.mostrarToast("Error al procesar el pedido. Intente nuevamente.", "danger")
    }
  }

  private comandasIguales(comanda1: any, comanda2: any): boolean {
    // Comparar arrays de items
    const arraysIguales = (arr1: any[], arr2: any[]) => {
      if (arr1.length !== arr2.length) return false
      return arr1.every((item1: any, index: number) => {
        const item2 = arr2[index]
        return item1.nombre === item2.nombre && item1.cantidad === item2.cantidad && item1.precio === item2.precio
      })
    }

    return (
      arraysIguales(comanda1.itemsAlmuerzo || [], comanda2.itemsAlmuerzo || []) &&
      arraysIguales(comanda1.itemsEspeciales || [], comanda2.itemsEspeciales || []) &&
      arraysIguales(comanda1.itemsBebidas || [], comanda2.itemsBebidas || []) &&
      arraysIguales(comanda1.itemsAdicionales || [], comanda2.itemsAdicionales || []) &&
      comanda1.total === comanda2.total
    )
  }

  private reiniciarComanda(): void {
    this.numeroComanda = Math.floor(1000 + Math.random() * 9000)
    this.itemsAlmuerzo = []
    this.itemsEspeciales = []
    this.itemsBebidas = []
    this.itemsAdicionales = []
    this.mesaSeleccionada = null
    this.tipoActual = "almuerzo"
    this.itemForm = this.createAlmuerzoForm()
    this.subscribeToFormChanges()
  }
  calcularTotal(): number {
    const totalAlmuerzo = this.itemsAlmuerzo.reduce((sum, item) => sum + item.valorTotal, 0);
    const totalEspeciales = this.itemsEspeciales.reduce((sum, item) => sum + item.valorTotal, 0);
    const totalBebidas = this.itemsBebidas.reduce((sum, item) => sum + item.valorTotal, 0);
    const totalAdicionales = this.itemsAdicionales.reduce((sum, item) => sum + item.valorTotal, 0);
    return totalAlmuerzo + totalEspeciales + totalBebidas + totalAdicionales;
  }

  async mostrarToast(mensaje: string, color = "primary") {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color,
      position: "bottom"
    });
    toast.present();
  }

  irAAdmin() {
    this.router.navigate(['/admin']);
  }
}