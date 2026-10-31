import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { readToken } from '../services/auth.service';

/** Adds the JWT — only to our own API, never to any other host. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = readToken();
  if (!token || !req.url.startsWith(environment.apiBaseUrl)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
