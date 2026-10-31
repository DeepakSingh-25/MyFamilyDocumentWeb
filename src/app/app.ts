import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { UiHostComponent } from './shared/components/ui-host/ui-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiHostComponent],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    // Theme pehle page se hi lage (login par hamesha day mode, app pages par saved choice)
    inject(ThemeService);
  }
}
