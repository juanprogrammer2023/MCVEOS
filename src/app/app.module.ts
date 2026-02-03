import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Tu archivo de entorno
import { environment } from '../environments/environment';


import { HttpClientModule } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth,connectAuthEmulator } from '@angular/fire/auth';
import { getFirestore, provideFirestore,connectFirestoreEmulator } from '@angular/fire/firestore';
import { getDatabase, provideDatabase,connectDatabaseEmulator } from '@angular/fire/database';


@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,

    HttpClientModule,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, 
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)), 
    
    // Auth con emulador
    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
      return auth;
    }),
    
    // Firestore con emulador
    provideFirestore(() => {
      const firestore = getFirestore();
      if (environment.useEmulators) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    }),
    
    // Realtime Database con emulador
    provideDatabase(() => {
      const database = getDatabase();
      if (environment.useEmulators) {
        connectDatabaseEmulator(database, 'localhost', 9000);
      }
      return database;
    }),
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}