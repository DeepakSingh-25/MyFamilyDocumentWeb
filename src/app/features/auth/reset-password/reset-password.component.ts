import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { matchValidator, STRONG_PASSWORD } from '../../../shared/validators';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  /** ?token= query param */
  readonly token = input<string>();
  readonly showPassword = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  }, { validators: matchValidator('password', 'confirmPassword') });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');
    this.auth.resetPassword(this.token()!, this.form.getRawValue().password).subscribe({
      next: () => {
        this.ui.success('Please log in with your new password.', 'Password changed');
        this.router.navigateByUrl('/login');
      },
      error: err => { this.error.set(errorMessage(err)); this.saving.set(false); },
    });
  }
}
