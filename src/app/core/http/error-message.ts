import { HttpErrorResponse } from '@angular/common/http';

const GENERIC = 'Something went wrong. Please try again.';

/**
 * Text to show the user for a failed call. The API sends ProblemDetails with the message in
 * `detail` (spec 001 §3.1); plain Error objects (client-side checks) keep their own message.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Please check your connection and try again.';
    // Login/auth endpoints apna message (detail) bhejte hain; baaki 401 = session khatam
    if (err.status === 401 && !(err.error && typeof err.error === 'object' && typeof err.error.detail === 'string')) {
      return 'Your session has ended. Please log in again.';
    }
    if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    const body = err.error;
    if (body && typeof body === 'object' && !(body instanceof Blob)) {
      if (typeof body.detail === 'string' && body.detail) return body.detail;
      if (typeof body.title === 'string' && body.title && err.status < 500) return body.title;
    }
    if (err.status === 404) return 'Not found. It may have been deleted.';
    return GENERIC;
  }
  return err instanceof Error && err.message ? err.message : GENERIC;
}
