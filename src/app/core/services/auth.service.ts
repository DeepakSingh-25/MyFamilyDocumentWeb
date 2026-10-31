import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/models';
import { UiService } from './ui.service';

const TOKEN_KEY = 'fd_token';

export interface SignupRequest { fullName: string; email: string; password: string; setupCode: string; }
interface LoginResponse { token: string; expiresOn: string; user: User; }

/** JWT for this browser tab (sessionStorage — closing the tab logs out). */
export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

/** Authentication against the API (`/api/auth`). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  private readonly url = `${environment.apiBaseUrl}/auth`;

  readonly currentUser = signal<User | null>(null);
  private loggingOut = false;

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  /** Id of the signed-in user. The API takes the id from the token; this is for the UI only. */
  requireUserId(): string {
    const user = this.currentUser();
    if (!user) throw new Error('Your session has ended. Please log in again.');
    return user.id;
  }

  /** Runs once at start-up: a saved token is checked with /auth/me before any route opens. */
  restoreSession(): Observable<void> {
    if (!readToken()) return of(undefined);
    return this.http.get<User>(`${this.url}/me`).pipe(
      // API latak jaye to app khaali page par na ruke
      timeout(10_000),
      tap(user => this.currentUser.set(user)),
      map(() => undefined),
      catchError((err: unknown) => {
        // Sirf 401 par token hatao; API restart / network error par token bacha rahe
        if (err instanceof HttpErrorResponse && err.status === 401) sessionStorage.removeItem(TOKEN_KEY);
        return of(undefined);
      }),
    );
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>(`${this.url}/login`, { email: email.trim(), password }).pipe(
      tap(res => this.startSession(res)),
      map(res => res.user),
    );
  }

  registrationOpen(): Observable<boolean> {
    return this.http.get<{ open: boolean }>(`${this.url}/registration-status`).pipe(map(res => res.open));
  }

  signup(req: SignupRequest): Observable<void> {
    return this.http.post<void>(`${this.url}/signup`, { ...req, fullName: req.fullName.trim(), email: req.email.trim() });
  }

  /** Always succeeds, so nobody can find out which emails have accounts. The link goes by email only. */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.url}/forgot-password`, { email: email.trim() });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.url}/reset-password`, { token, newPassword });
  }

  /**
   * The API signs out every old token (this tab's too) and sends a new one for this tab.
   * The new token is saved only so that the caller's logout() can revoke it on the server;
   * the change-password page logs out right after, so the user logs in again with the new password.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<User> {
    return this.http.post<LoginResponse>(`${this.url}/change-password`, { currentPassword, newPassword }).pipe(
      tap(res => this.startSession(res)),
      map(res => res.user),
    );
  }

  /**
   * Server-side logout: pehle API ko batao (token wahan revoke hota hai), phir is tab se token hatao.
   * API fail ho / 3 s mein jawab na de, tab bhi user logout hi hota hai — kabhi logged-in na reh jaye.
   */
  logout(): void {
    if (this.loggingOut) return;
    if (!readToken()) {
      this.clearSession();
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
    this.loggingOut = true;
    this.ui.loading.set(true);
    // Token request ke baad hi hatate hain — interceptor ko header mein bhejna hai
    this.http.post<void>(`${this.url}/logout`, {}).pipe(
      timeout(3_000),
      catchError(() => of(undefined)),
      finalize(() => {
        this.loggingOut = false;
        this.ui.loading.set(false);
        this.clearSession();
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }),
    ).subscribe();
  }

  /** Called by the error interceptor on a 401: back to login, then return to the same page. */
  sessionExpired(): void {
    // Logout chal raha hai to wahi /login le jayega — doosra toast / redirect nahi
    if (this.loggingOut || !this.isLoggedIn()) return;
    this.clearSession();
    this.ui.error('Your session has ended. Please log in again.');
    const returnUrl = this.router.url;
    this.router.navigate(['/login'], { queryParams: returnUrl && returnUrl !== '/login' ? { returnUrl } : {} });
  }

  private startSession(res: LoginResponse): void {
    sessionStorage.setItem(TOKEN_KEY, res.token);
    this.currentUser.set(res.user);
  }

  private clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
  }
}
