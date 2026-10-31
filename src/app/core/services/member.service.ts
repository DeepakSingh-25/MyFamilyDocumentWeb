import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FamilyMember, MemberInput } from '../../shared/models/models';

/** Family members of the signed-in user (`/api/members`). The API scopes every call to the token's user. */
@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/members`;

  list(): Observable<FamilyMember[]> {
    return this.http.get<FamilyMember[]>(this.url);
  }

  get(id: string): Observable<FamilyMember> {
    return this.http.get<FamilyMember>(`${this.url}/${id}`);
  }

  create(input: MemberInput): Observable<FamilyMember> {
    return this.http.post<FamilyMember>(this.url, this.body(input));
  }

  update(id: string, input: MemberInput): Observable<FamilyMember> {
    return this.http.put<FamilyMember>(`${this.url}/${id}`, this.body(input));
  }

  /** Removes the member and their documents from the app (soft delete on the API; restore is done with SQL). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  private body(input: MemberInput) {
    return { name: input.name.trim(), relationshipId: input.relationshipId, dateOfBirth: input.dateOfBirth || null };
  }
}
