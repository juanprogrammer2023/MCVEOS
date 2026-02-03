import { Component, Input } from "@angular/core"
import { ModalController } from "@ionic/angular"

interface Comanda {
  id?: string
  numeroComanda: number
  fecha: Date | any
  mesa: string
  numeroMesa: number
  itemsAlmuerzo: any[]
  itemsEspeciales: any[]
  itemsBebidas?: any[]
  itemsAdicionales?: any[] // 👈 AGREGA ESTA LÍNEA
  total: number
  estado: string
  clienteId?: string
}

@Component({
  selector: "app-comanda-detalle-modal",
  templateUrl: "./comanda-detalle-modal.component.html",
  styleUrls: ["./comanda-detalle-modal.component.scss"],
  standalone: false,
})
export class ComandaDetalleModalComponent {
  @Input() comanda!: Comanda

  constructor(private modalController: ModalController) {}

  cerrarModal() {
    this.modalController.dismiss()
  }

  getFechaFormateada(): string {
    const fecha = this.comanda.fecha instanceof Date ? this.comanda.fecha : new Date(this.comanda.fecha)
    return fecha.toLocaleString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  getEstadoTexto(): string {
    switch (this.comanda.estado) {
      case "pendiente":
        return "Pendiente"
      case "preparacion":
        return "En preparación"
      case "lista":
        return "Lista"
      case "entregada":
        return "Entregada"
      case "cancelada":
        return "Cancelada"
      default:
        return "Desconocido"
    }
  }

  getEstadoColor(): string {
    switch (this.comanda.estado) {
      case "pendiente":
        return "warning"
      case "preparacion":
        return "primary"
      case "lista":
        return "success"
      case "entregada":
        return "medium"
      case "cancelada":
        return "danger"
      default:
        return "medium"
    }
  }

  formatearNumero(numero: number): string {
    return new Intl.NumberFormat("es-CO").format(numero)
  }

  imprimirComanda() {
    const ventana = window.open("", "_blank", "width=600,height=800")

    if (ventana) {
      ventana.document.open()
      ventana.document.write(`
        <html>
          <head>
            <title>Comanda #${this.comanda.numeroComanda}</title>
            <meta charset="UTF-8">
            <style>
              @page {
                margin: 0;
                size: 80mm auto;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                width: 80mm;
                font-family: 'Arial', 'Helvetica', sans-serif;
                font-size: 11px;
                line-height: 1.4;
                color: #000;
                padding: 8mm;
                background: #fff;
              }
              
              .ticket-header {
                text-align: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 2px solid #000;
              }
              
              .ticket-header h1 {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .ticket-header .comanda-numero {
                font-size: 14px;
                font-weight: bold;
                margin: 6px 0;
              }
              
              .info-general {
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px dashed #333;
              }
              
              .info-row {
                display: flex;
                justify-content: space-between;
                margin: 4px 0;
                font-size: 10px;
              }
              
              .info-row .label {
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .info-row .value {
                text-align: right;
              }
              
              .seccion {
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px dashed #333;
              }
              
              .seccion-titulo {
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 6px;
                padding: 4px;
                background: #f0f0f0;
                text-align: center;
                border-radius: 2px;
              }
              
              .item {
                margin: 6px 0;
                padding: 4px 0;
              }
              
              .item-header {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                margin-bottom: 2px;
              }
              
              .item-detalle {
                font-size: 10px;
                color: #333;
                margin-left: 8px;
                line-height: 1.3;
              }
              
              .item-precio {
                text-align: right;
                font-weight: bold;
              }
              
              .totales {
                margin-top: 12px;
                padding-top: 8px;
                border-top: 2px solid #000;
              }
              
              .total-row {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                font-weight: bold;
                margin: 6px 0;
              }
              
              .ticket-footer {
                text-align: center;
                margin-top: 12px;
                padding-top: 8px;
                border-top: 1px dashed #333;
                font-size: 10px;
              }
              
              .estado-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .estado-pendiente { background: #fff3cd; color: #856404; }
              .estado-preparacion { background: #cfe2ff; color: #084298; }
              .estado-lista { background: #d1e7dd; color: #0f5132; }
              .estado-entregada { background: #e2e3e5; color: #41464b; }
              .estado-cancelada { background: #f8d7da; color: #842029; }
              
              @media print {
                body {
                  padding: 4mm;
                }
              }
            </style>
          </head>
          <body>
            ${this.generarHTMLImpresion()}
          </body>
        </html>
      `)
      ventana.document.close()

      // Esperar a que se cargue el contenido antes de imprimir
      setTimeout(() => {
        ventana.print()
        ventana.close()
      }, 250)
    }
  }

  private generarHTMLImpresion(): string {
    let html = `
      <div class="ticket-header">
        <h1>COMANDA</h1>
        <div class="comanda-numero">#${this.comanda.numeroComanda}</div>
      </div>
      
      <div class="info-general">
        <div class="info-row">
          <span class="label">Mesa:</span>
          <span class="value">${this.comanda.mesa}</span>
        </div>
        <div class="info-row">
          <span class="label">Fecha:</span>
          <span class="value">${this.getFechaFormateada()}</span>
        </div>
        <div class="info-row">
          <span class="label">Estado:</span>
          <span class="value">
            <span class="estado-badge estado-${this.comanda.estado}">
              ${this.getEstadoTexto()}
            </span>
          </span>
        </div>
      </div>
    `

    // Almuerzos del día
    if (this.comanda.itemsAlmuerzo && this.comanda.itemsAlmuerzo.length > 0) {
      html += `
        <div class="seccion">
          <div class="seccion-titulo">🍽️ Almuerzos del Día (${this.comanda.itemsAlmuerzo.length})</div>
      `

      this.comanda.itemsAlmuerzo.forEach((item, index) => {
        html += `
          <div class="item">
            <div class="item-header">
              <span>${index + 1}. ${item.proteina}</span>
              <span class="item-precio">$${this.formatearNumero(item.valorTotal)}</span>
            </div>
            <div class="item-detalle">
              ${item.principio ? `• Principio: ${item.principio}<br>` : ""}
              ${item.sopa ? `• Sopa: ${item.sopa}<br>` : ""}
              ${item.jugo ? `• Jugo: ${item.jugo}<br>` : ""}
              • Arroz: ${item.arroz === "Sí" ? "Sí" : "No"}
            </div>
          </div>
        `
      })

      html += `</div>`
    }

    // Platos especiales
    if (this.comanda.itemsEspeciales && this.comanda.itemsEspeciales.length > 0) {
      html += `
        <div class="seccion">
          <div class="seccion-titulo">⭐ Platos Especiales (${this.comanda.itemsEspeciales.length})</div>
      `

      this.comanda.itemsEspeciales.forEach((item, index) => {
        html += `
          <div class="item">
            <div class="item-header">
              <span>${index + 1}. ${item.plato}</span>
              <span class="item-precio">$${this.formatearNumero(item.valorTotal)}</span>
            </div>
            <div class="item-detalle">
              • Cantidad: ${item.cantidad}<br>
              • Precio unitario: $${this.formatearNumero(item.precioUnitario)}
            </div>
          </div>
        `
      })

      html += `</div>`
    }

    // Bebidas
    if (this.comanda.itemsBebidas && this.comanda.itemsBebidas.length > 0) {
      html += `
        <div class="seccion">
          <div class="seccion-titulo">🍺 Bebidas (${this.comanda.itemsBebidas.length})</div>
      `

      this.comanda.itemsBebidas.forEach((bebida, index) => {
        html += `
          <div class="item">
            <div class="item-header">
              <span>${index + 1}. ${bebida.bebida}</span>
              <span class="item-precio">$${this.formatearNumero(bebida.valorTotal)}</span>
            </div>
            <div class="item-detalle">
              • Categoría: ${bebida.categoria}<br>
              • Cantidad: ${bebida.cantidad}<br>
              • Precio unitario: $${this.formatearNumero(bebida.precioUnitario)}
            </div>
          </div>
        `
      })

      html += `</div>`
    }

    // Adicionales
    if (this.comanda.itemsAdicionales && this.comanda.itemsAdicionales.length > 0) {
      html += `
        <div class="seccion">
          <div class="seccion-titulo">➕ Adicionales (${this.comanda.itemsAdicionales.length})</div>
      `

      this.comanda.itemsAdicionales.forEach((adicional, index) => {
        html += `
          <div class="item">
            <div class="item-header">
              <span>${index + 1}. ${adicional.adicional}</span>
              <span class="item-precio">$${this.formatearNumero(adicional.valorTotal)}</span>
            </div>
            <div class="item-detalle">
              • Cantidad: ${adicional.cantidad}<br>
              • Precio unitario: $${this.formatearNumero(adicional.precioUnitario)}
            </div>
          </div>
        `
      })

      html += `</div>`
    }

    // Total
    html += `
      <div class="totales">
        <div class="total-row">
          <span>TOTAL:</span>
          <span>$${this.formatearNumero(this.comanda.total)}</span>
        </div>
      </div>
      
      <div class="ticket-footer">
        <p>¡Gracias por su preferencia!</p>
        <p>Impreso: ${new Date().toLocaleString("es-ES")}</p>
      </div>
    `

    return html
  }
}
