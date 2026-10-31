import { effect, Injectable, signal } from '@angular/core';

const KEY = 'fd_theme';

/**
 * Light / dark (night) mode. The user's choice is kept in localStorage; first visit is light.
 * Night mode shows only inside the app (ShellComponent) — login, sign-up and other public pages stay light.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** The user's choice (what the toggle shows and what is saved). */
  private readonly choice = signal(this.initial());
  readonly dark = this.choice.asReadonly();
  /** True while the signed-in app layout (there is only one ShellComponent) is on screen. */
  private readonly inApp = signal(false);

  constructor() {
    effect(() => {
      const theme = this.dark() && this.inApp() ? 'dark' : 'light';
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-bs-theme', theme);
    });
  }

  toggle(): void {
    this.choice.update(d => !d);
    try { localStorage.setItem(KEY, this.dark() ? 'dark' : 'light'); } catch { /* storage blocked — still works for this visit */ }
  }

  /** Called by ShellComponent: on while the app layout lives, off when it goes (logout → login page). */
  setInApp(value: boolean): void { this.inApp.set(value); }

  private initial(): boolean {
    try { return localStorage.getItem(KEY) === 'dark'; } catch { return false; }
  }
}
