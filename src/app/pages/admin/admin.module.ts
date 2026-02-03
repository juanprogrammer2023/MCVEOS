import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { IonicModule } from "@ionic/angular"
import { AdminPageRoutingModule } from "./admin-routing.module"
import { AdminPage } from "./admin.page"
import { ComandaDetalleModalComponent } from "../../components/comanda-detalle-modal/comanda-detalle-modal.component"

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AdminPageRoutingModule],
  declarations: [AdminPage, ComandaDetalleModalComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminPageModule {}
