import { Component } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {


  constructor() { 
    this.showSplashScreen();
  }

  async showSplashScreen() {
    await SplashScreen.show({
      autoHide: true,
      showDuration:2000,
    });

  }
}
