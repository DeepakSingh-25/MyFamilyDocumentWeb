import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile } from '../../shared/models/models';

/** Profile of the signed-in user (`/api/account`). The API takes the user from the token. */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/account`;

  /** Header + profile page dono yahi photo dikhate hain — apna `blob:` URL, ya null jab photo nahi. */
  readonly photoUrl = signal<string | null>(null);
  /** Chal rahi photo GET — logout / upload / delete par cancel, taaki der se aaya jawab purani photo wapas na laaye. */
  private photoLoad?: Subscription;

  profile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.url}/profile`);
  }

  updateProfile(fullName: string): Observable<Profile> {
    return this.http.put<Profile>(`${this.url}/profile`, { fullName: fullName.trim() });
  }

  /** Photo API se laata hai (token ke saath, isliye `<img src>` seedha API par nahi). 404 = photo nahi. */
  loadPhoto(): void {
    this.photoLoad?.unsubscribe();
    this.photoLoad = this.http.get(`${this.url}/photo`, { responseType: 'blob' }).subscribe({
      next: blob => this.setPhoto(blob),
      error: () => this.setPhoto(null),
    });
  }

  uploadPhoto(file: File): Observable<Profile> {
    this.photoLoad?.unsubscribe();
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.put<Profile>(`${this.url}/photo`, form).pipe(tap(() => this.setPhoto(file)));
  }

  deletePhoto(): Observable<Profile> {
    this.photoLoad?.unsubscribe();
    return this.http.delete<Profile>(`${this.url}/photo`).pipe(tap(() => this.setPhoto(null)));
  }

  /** Logout (shell destroy) par: chal rahi GET cancel aur photo memory se saaf. */
  clearPhoto(): void {
    this.photoLoad?.unsubscribe();
    this.setPhoto(null);
  }

  /** Purana object URL free karke naya set karta hai. */
  private setPhoto(blob: Blob | null): void {
    const old = this.photoUrl();
    if (old) URL.revokeObjectURL(old);
    this.photoUrl.set(blob ? URL.createObjectURL(blob) : null);
  }
}
