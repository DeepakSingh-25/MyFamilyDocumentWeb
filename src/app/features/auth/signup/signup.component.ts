import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { matchValidator, STRONG_PASSWORD } from '../../../shared/validators';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './signup.component.html',
})
export class SignupComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  readonly open = signal<boolean | null>(null);
  /** Status call fail hui (API band / network) — spinner ki jagah Retry dikhao. */
  readonly statusError = signal('');
  readonly showPassword = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
    setupCode: ['', Validators.required],
  }, { validators: matchValidator('password', 'confirmPassword') });

  ngOnInit(): void {
    this.loadStatus();
  }

  loadStatus(): void {
    this.open.set(null);
    this.statusError.set('');
    this.auth.registrationOpen().subscribe({
      next: open => this.open.set(open),
      error: err => this.statusError.set(errorMessage(err)),
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { fullName, email, password, setupCode } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.auth.signup({ fullName, email, password, setupCode }).subscribe({
      next: () => {
        this.ui.success('Account created. Please log in.');
        this.router.navigateByUrl('/login');
      },
      error: err => { this.error.set(errorMessage(err)); this.saving.set(false); },
    });
  }
}
