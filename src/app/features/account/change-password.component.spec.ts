import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let auth: { changePassword: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let ui: UiService;

  const fill = () => fixture.componentInstance.form.setValue({
    currentPassword: 'OldPass123', newPassword: 'NewPass123', confirmPassword: 'NewPass123',
  });

  beforeEach(async () => {
    auth = { changePassword: vi.fn(), logout: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    fixture = TestBed.createComponent(ChangePasswordComponent);
    ui = TestBed.inject(UiService);
    await fixture.whenStable();
  });

  it('logs out after a successful change and asks to log in with the new password', async () => {
    auth.changePassword.mockReturnValue(of({ id: 'x', fullName: 'A', email: 'a@b.c', createdOn: '' }));
    fill();

    fixture.componentInstance.changePassword();
    await fixture.whenStable();

    expect(auth.changePassword).toHaveBeenCalledWith('OldPass123', 'NewPass123');
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(ui.toasts().map(t => t.title)).toEqual(['Password changed']);
  });

  it('stays signed in and shows the error when the change fails', async () => {
    auth.changePassword.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 400, error: { detail: 'Current password is not correct.' } })));
    fill();

    fixture.componentInstance.changePassword();
    await fixture.whenStable();

    expect(auth.logout).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toBe('Current password is not correct.');
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('does not call the API while the form is invalid', () => {
    fixture.componentInstance.changePassword();

    expect(auth.changePassword).not.toHaveBeenCalled();
  });
});
