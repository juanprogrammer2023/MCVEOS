import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ComandaDetalleModalComponent } from './comanda-detalle-modal.component';

describe('ComandaDetalleModalComponent', () => {
  let component: ComandaDetalleModalComponent;
  let fixture: ComponentFixture<ComandaDetalleModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ComandaDetalleModalComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ComandaDetalleModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
