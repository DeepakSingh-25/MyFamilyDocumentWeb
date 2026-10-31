import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, OnInit, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { errorMessage } from '../../../core/http/error-message';
import { CategoryService } from '../../../core/services/category.service';
import { RelationshipService } from '../../../core/services/relationship.service';
import { UiService } from '../../../core/services/ui.service';
import { CATEGORY_EXAMPLES_MAX, CATEGORY_NAME_MAX, RELATIONSHIP_NAME_MAX } from '../../constants';
import { DocumentCategory, LookupItem } from '../../models/models';
import { notBlank } from '../../validators';

export type LookupKind = 'category' | 'relationship';

/**
 * Small dialog to add (or rename) the user's own category / relationship (spec 013). Used from the
 * "+ Add new…" dropdown option and the Lists page. The parent shows it with `@if` and removes it on
 * `saved` or `closed`. It sits above the Add Member dialog, which ignores Esc while this one is open.
 */
@Component({
  selector: 'app-quick-add',
  imports: [ReactiveFormsModule],
  templateUrl: './quick-add.component.html',
  styleUrl: './quick-add.component.css',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class QuickAddComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categories = inject(CategoryService);
  private readonly relationships = inject(RelationshipService);
  private readonly ui = inject(UiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly kind = input.required<LookupKind>();
  /** Item to rename; `null` adds a new one. */
  readonly item = input<LookupItem | null>(null);

  readonly saved = output<LookupItem>();
  readonly closed = output<void>();

  readonly isCategory = computed(() => this.kind() === 'category');
  readonly noun = computed(() => this.isCategory() ? 'Category' : 'Relationship');
  readonly title = computed(() => `${this.item() ? 'Rename' : 'Add'} ${this.noun()}`);
  readonly nameMax = computed(() => this.isCategory() ? CATEGORY_NAME_MAX : RELATIONSHIP_NAME_MAX);
  readonly examplesMax = CATEGORY_EXAMPLES_MAX;
  readonly saving = signal(false);
  readonly formError = signal('');

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank]],
    examples: ['', Validators.maxLength(CATEGORY_EXAMPLES_MAX)],
  });

  constructor() {
    afterNextRender(() => this.nameInput()?.nativeElement.focus());
  }

  ngOnInit(): void {
    this.form.controls.name.addValidators(Validators.maxLength(this.nameMax()));
    const item = this.item();
    this.form.reset({ name: item?.name ?? '', examples: (item as DocumentCategory | null)?.examples ?? '' });
  }

  save(): void {
    if (this.ui.confirmState()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const name = this.form.controls.name.value.trim();
    const id = this.item()?.id;
    let request: Observable<LookupItem>;
    if (this.isCategory()) {
      const input = { name, examples: this.form.controls.examples.value.trim() };
      request = id ? this.categories.update(id, input) : this.categories.create(input);
    } else {
      request = id ? this.relationships.update(id, { name }) : this.relationships.create({ name });
    }
    this.saving.set(true);
    this.formError.set('');
    // Parent gone (sign-out, navigation) → drop the answer, no emit on a destroyed output
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: saved => {
        this.saving.set(false);
        this.ui.success(`${this.noun()} ${id ? 'renamed' : 'added'}.`);
        this.saved.emit(saved);
      },
      error: err => { this.saving.set(false); this.formError.set(errorMessage(err)); },
    });
  }

  close(): void {
    if (!this.saving()) this.closed.emit();
  }

  onEscape(): void {
    // Esc on the confirm dialog belongs to that dialog. A dialog below (Add Member) ignores Esc while this one is open.
    if (!this.ui.confirmState()) this.close();
  }
}
