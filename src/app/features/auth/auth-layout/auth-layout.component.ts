import { Component, input } from '@angular/core';

/** Shared frame for login / sign-up / password pages. */
@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>('');
}
