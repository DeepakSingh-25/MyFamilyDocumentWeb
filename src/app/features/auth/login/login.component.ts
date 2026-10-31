import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
import { APP_RETURN_ROOTS, safeReturnUrl } from '../../../core/navigation/safe-return-url';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  readonly returnUrl = input<string>();
  readonly showPassword = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { email, password } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.auth.login(email, password).subscribe({
      next: user => {
        this.ui.success(`Welcome back, ${user.fullName}!`);
        // Only our own signed-in pages (spec 010 §B.4) — never another site
        void this.router.navigateByUrl(safeReturnUrl(this.router, this.returnUrl(), APP_RETURN_ROOTS) ?? '/dashboard');
      },
      error: err => { this.error.set(errorMessage(err)); this.saving.set(false); },
    });
  }
}
