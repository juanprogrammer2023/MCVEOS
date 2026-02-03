// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// src/environments/environment.ts

export const environment = {
  adminPassword: '1234',
  production: false,
  useEmulators: true,
  firebaseConfig: {
    projectId: "comandasapp-27083",
    appId: "1:202261581930:web:28f6acceaa0046ace47a13",
    storageBucket: "comandasapp-27083.appspot.com", // ⚠️ corregido `.app` por `.com`
    apiKey: "AIzaSyCY-kCa_runwcFcPZKyRgBp1E9x9BRNNDw",
    authDomain: "comandasapp-27083.firebaseapp.com",
    messagingSenderId: "202261581930",
    measurementId: "G-KXJQR6BT0P"
  }
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
