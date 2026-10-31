import { Injectable, Signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Relationship, RelationshipInput } from '../../shared/models/models';
import { LookupStore } from './lookup-store';

/** Built-in + the user's own relationships from `/api/relationships` (spec 013), loaded once and shared. */
@Injectable({ providedIn: 'root' })
export class RelationshipService extends LookupStore<Relationship, RelationshipInput> {
  protected readonly url = `${environment.apiBaseUrl}/relationships`;
  protected readonly loadErrorText = 'Could not load relationships. Please reload the page.';

  relationships(): Signal<Relationship[]> {
    return this.items();
  }
}
