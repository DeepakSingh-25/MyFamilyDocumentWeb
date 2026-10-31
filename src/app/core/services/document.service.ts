import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DEFAULT_PAGE_SIZE } from '../../shared/constants';
import {
  DashboardSummary, DocumentCounts, DocumentCountsFilter, DocumentInput, DocumentQuery, FamilyDocument, PagedResult,
} from '../../shared/models/models';
import { checkFile, detectFileType } from '../file-rules';

/** Documents of the signed-in user (`/api/documents`, `/api/dashboard`). The API checks ownership and repeats the file checks. */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/documents`;

  /** One page, newest first (spec 009 §B.1). Page 1 and size 10 are the API defaults, so they are left out. */
  list(query: DocumentQuery = {}): Observable<PagedResult<FamilyDocument>> {
    let params = this.filterParams(query);
    const search = query.search?.trim();
    if (search) params = params.set('search', search);
    if (query.page && query.page > 1) params = params.set('page', query.page);
    if (query.pageSize && query.pageSize !== DEFAULT_PAGE_SIZE) params = params.set('pageSize', query.pageSize);
    return this.http.get<PagedResult<FamilyDocument>>(this.url, { params });
  }

  /** Totals for the Medical tabs and member chips; ignores search (spec 009 §B.3). */
  counts(filter: DocumentCountsFilter = {}): Observable<DocumentCounts> {
    return this.http.get<DocumentCounts>(`${this.url}/counts`, { params: this.filterParams(filter) });
  }

  get(id: string): Observable<FamilyDocument> {
    return this.http.get<FamilyDocument>(`${this.url}/${id}`);
  }

  create(input: DocumentInput): Observable<FamilyDocument> {
    return from(this.validateFile(input.file, true)).pipe(
      switchMap(() => this.http.post<FamilyDocument>(this.url, this.formData(input))),
    );
  }

  /** Updates details; when input.file is set the stored file is replaced. */
  update(id: string, input: DocumentInput): Observable<FamilyDocument> {
    return from(this.validateFile(input.file, false)).pipe(
      switchMap(() => this.http.put<FamilyDocument>(`${this.url}/${id}`, this.formData(input))),
    );
  }

  /** Removes the document from the app (soft delete on the API; restore is done with SQL). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** The stored file as a Blob (preview / download) — the token goes in the header, never in a URL. */
  getFile(id: string): Observable<Blob> {
    return this.http.get(`${this.url}/${id}/file`, { responseType: 'blob' });
  }

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${environment.apiBaseUrl}/dashboard`);
  }

  /** Fast client checks before uploading; the API checks again. Throws Error(message to show). */
  private async validateFile(file: File | null | undefined, required: boolean): Promise<void> {
    if (!file) {
      if (required) throw new Error('Please choose a file to upload.');
      return;
    }
    const problem = checkFile(file);
    if (problem) throw new Error(problem);
    if (!await detectFileType(file)) {
      throw new Error('The file content does not match its type. Please upload a real PDF, JPG or PNG.');
    }
  }

  private filterParams(filter: DocumentCountsFilter): HttpParams {
    let params = new HttpParams();
    if (filter.memberId) params = params.set('memberId', filter.memberId);
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId);
    return params;
  }

  private formData(input: DocumentInput): FormData {
    const data = new FormData();
    data.append('name', input.name.trim());
    data.append('memberId', String(input.memberId));
    data.append('categoryId', String(input.categoryId));
    if (input.documentDate) data.append('documentDate', input.documentDate);
    if (input.hospitalOrDoctor?.trim()) data.append('hospitalOrDoctor', input.hospitalOrDoctor.trim());
    if (input.notes?.trim()) data.append('notes', input.notes.trim());
    if (input.file) data.append('file', input.file, input.file.name);
    return data;
  }
}
