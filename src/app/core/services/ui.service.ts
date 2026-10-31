import { Injectable, signal } from '@angular/core';

export interface ToastItem { id: number; title: string; text: string; error: boolean; }
export interface ConfirmState { title: string; message: string; confirmLabel: string; resolve: (ok: boolean) => void; }

/** Toast messages + "are you sure?" dialog, rendered once by UiHostComponent. */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly toasts = signal<ToastItem[]>([]);
  readonly confirmState = signal<ConfirmState | null>(null);
  readonly loading = signal(false);
  /** How long a toast stays; the toast's progress bar runs for the same time. */
  readonly toastMs = 5000;
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  /** Element that had focus before the confirm opened — focus goes back there afterwards. */
  private returnFocus: HTMLElement | null = null;

  success(text: string, title = 'Success'): void { this.push(title, text, false); }
  error(text: string, title = 'Something went wrong'): void { this.push(title, text, true); }

  /** Close a toast before its time is up (its × button). */
  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  confirm(title: string, message: string, confirmLabel = 'Delete'): Promise<boolean> {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return new Promise<boolean>(resolve =>
      this.confirmState.set({ title, message, confirmLabel, resolve }));
  }

  answer(ok: boolean): void {
    this.confirmState()?.resolve(ok);
    this.confirmState.set(null);
    // Only if it is still on the page (e.g. not the Delete button of a removed card)
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  private push(title: string, text: string, error: boolean): void {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { id, title, text, error }]);
    this.timers.set(id, setTimeout(() => this.dismiss(id), this.toastMs));
  }
}
