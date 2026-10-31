import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-ui-host',
  templateUrl: './ui-host.component.html',
  styleUrl: './ui-host.component.css',
  host: { '(document:keydown.escape)': 'onEscape($event)' },
})
export class UiHostComponent {
  readonly ui = inject(UiService);

  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('confirmCancel');

  constructor() {
    // Confirm khulte hi focus Cancel par — warna Enter peeche wale form ko submit kar deta
    effect(() => this.cancelButton()?.nativeElement.focus());
  }

  /** Esc closes the confirm (= Cancel). Other Esc listeners (e.g. the member form) must not see this press. */
  onEscape(event: Event): void {
    if (!this.ui.confirmState()) return;
    event.stopImmediatePropagation();
    this.ui.answer(false);
  }
}
