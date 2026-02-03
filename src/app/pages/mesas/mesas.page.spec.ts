import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MesasPage } from './mesas.page';

describe('MesasPage', () => {
  let component: MesasPage;
  let fixture: ComponentFixture<MesasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MesasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
