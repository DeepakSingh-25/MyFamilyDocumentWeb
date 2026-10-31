import { Component, computed, inject, input, signal, untracked } from '@angular/core';
import { errorMessage } from '../../core/http/error-message';
import { CategoryService } from '../../core/services/category.service';
import { RelationshipService } from '../../core/services/relationship.service';
import { UiService } from '../../core/services/ui.service';
import { LookupKind, QuickAddComponent } from '../../shared/components/quick-add/quick-add.component';
import { DocumentCategory, LookupItem } from '../../shared/models/models';

/**
 * Categories page and Relationships page (spec 013) — one component, `kind` comes from the route data.
 * Built-in items are read-only; the user's own items can be added, renamed and deleted
 * (the API refuses a delete while in use).
 */
@Component({
  selector: 'app-lists',
  imports: [QuickAddComponent],
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.css',
})
export class ListsComponent {
  private readonly categoryService = inject(CategoryService);
  private readonly relationshipService = inject(RelationshipService);
  private readonly ui = inject(UiService);

  readonly kind = input<LookupKind>('category');
  readonly isCategory = computed(() => this.kind() === 'category');

  private readonly store = computed(() => this.isCategory() ? this.categoryService : this.relationshipService);
  // items() starts the load (writes signals), so it runs untracked — only the page's kind is a dependency
  readonly items = computed(() => { const store = this.store(); return untracked(() => store.items())(); });
  readonly failed = computed(() => this.store().loadFailed());

  /** Open dialog: the item to rename (null = add). */
  readonly dialog = signal<{ item: LookupItem | null } | null>(null);

  open(item: LookupItem | null = null): void {
    this.dialog.set({ item });
  }

  hint(item: LookupItem): string {
    return (item as DocumentCategory).examples ?? '';
  }

  async remove(item: LookupItem): Promise<void> {
    const noun = this.isCategory() ? 'category' : 'relationship';
    if (!(await this.ui.confirm(`Delete "${item.name}"?`, `This ${noun} will no longer be offered in the dropdown.`))) return;
    this.store().remove(item.id).subscribe({
      next: () => this.ui.success(`${this.isCategory() ? 'Category' : 'Relationship'} deleted.`),
      error: err => this.ui.error(errorMessage(err)),
    });
  }
}
