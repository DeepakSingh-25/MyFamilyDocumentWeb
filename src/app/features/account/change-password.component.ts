import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/error-message';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { matchValidator, STRONG_PASSWORD } from '../../shared/validators';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './change-password.component.html',
  styleUrl: './account.component.css',
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);

  // Har field ka apna show/hide
  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  }, { validators: matchValidator('newPassword', 'confirmPassword') });

  changePassword(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    // Jaan-boojhkar takeUntilDestroyed nahi: user page chhod de tab bhi logout hona chahiye
    // (server password badal chuka hota hai).
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      // Is tab ko bhi logout: naya token server par revoke + yahan se saaf, phir /login — naye password se login
      next: () => {
        this.ui.success('Please log in with your new password.', 'Password changed');
        this.auth.logout();
      },
      error: err => { this.saving.set(false); this.error.set(errorMessage(err)); },
    });
  }
}
