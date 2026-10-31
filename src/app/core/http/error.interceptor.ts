import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, readToken } from '../services/auth.service';

/** Auth calls answer 401 for wrong credentials themselves — that is not an expired session. */
const OWN_401 = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password', '/auth/me', '/auth/logout'];

/** A 401 from any other API call means the session ended: log out and come back via returnUrl. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401
        && req.url.startsWith(environment.apiBaseUrl)
        && !OWN_401.some(path => req.url.endsWith(path))
        // Sirf tab jab ye request ABHI wale token se gayi thi — password change ke baad purane token ki
        // der se aayi 401 naye session ko logout na kare
        && req.headers.get('Authorization') === `Bearer ${readToken()}`) {
        auth.sessionExpired();
      }
      return throwError(() => err);
    }),
  );
};
