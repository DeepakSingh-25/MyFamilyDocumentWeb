import { Injectable, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CategoryInput, DocumentCategory } from '../../shared/models/models';
import { LookupStore } from './lookup-store';

/** Built-in + the user's own categories from `/api/categories` (spec 013), loaded once and shared by every page. */
@Injectable({ providedIn: 'root' })
export class CategoryService extends LookupStore<DocumentCategory, CategoryInput> {
  protected readonly url = `${environment.apiBaseUrl}/categories`;
  protected readonly loadErrorText = 'Could not load document categories. Please reload the page.';

  categories(): Signal<DocumentCategory[]> {
    return this.items();
  }
}
