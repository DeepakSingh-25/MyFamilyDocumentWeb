import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, OnInit, output, signal, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { errorMessage } from '../../../core/http/error-message';
import { MemberService } from '../../../core/services/member.service';
import { RelationshipService } from '../../../core/services/relationship.service';
import { UiService } from '../../../core/services/ui.service';
import { QuickAddComponent } from '../../../shared/components/quick-add/quick-add.component';
import { watchAddNewOption } from '../../../shared/add-new-option';
import { ADD_NEW_ID, MEMBER_NAME_MAX, MIN_DATE_OF_BIRTH, SELF_RELATIONSHIP_ID } from '../../../shared/constants';
import { FamilyMember, LookupItem } from '../../../shared/models/models';
import { notBlank } from '../../../shared/validators';

/**
 * Add / Edit member dialog, used by the member list and the member page (spec 008 §B.2, §B.4).
 * The parent shows it with `@if` and removes it on `closed`, `saved` or `missing`.
 */
@Component({
  selector: 'app-member-form',
  imports: [ReactiveFormsModule, QuickAddComponent],
  templateUrl: './member-form.component.html',
  styleUrl: './member-form.component.css',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class MemberFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MemberService);
  private readonly ui = inject(UiService);

  /** Member to edit; `null` adds a new one. */
  readonly member = input<FamilyMember | null>(null);
  /** The family as loaded by the parent — used to disable a second "Self". */
  readonly members = input<FamilyMember[]>([]);

  readonly saved = output<FamilyMember>();
  readonly closed = output<void>();
  /** The member was removed elsewhere (API 404); the parent should reload. */
  readonly missing = output<string>();

  /** Built-in + the user's own relationships (spec 013). */
  readonly relationships = inject(RelationshipService).relationships();
  readonly addNewId = ADD_NEW_ID;
  /** "+ Add new relationship…" dialog is open on top of this one. */
  readonly addingRelationship = signal(false);
  readonly nameMax = MEMBER_NAME_MAX;
  readonly minDate = MIN_DATE_OF_BIRTH;
  /** Local date, not UTC — the API checks "today" in India time. */
  readonly today = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
  readonly saving = signal(false);
  readonly formError = signal('');

  /** "Self" is taken when another member already has it. */
  readonly selfTaken = computed(() =>
    this.members().some(m => m.relationshipId === SELF_RELATIONSHIP_ID && m.id !== this.member()?.id));

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(MEMBER_NAME_MAX)]],
    relationshipId: ['', Validators.required],
    // 'yyyy-MM-dd' strings compare correctly as text; empty = not given
    dateOfBirth: ['', (c: AbstractControl): ValidationErrors | null =>
      c.value && (c.value < this.minDate || c.value > this.today) ? { range: true } : null],
  });

  private readonly relationshipSelect = viewChild<ElementRef<HTMLSelectElement>>('relationshipSelect');

  constructor() {
    afterNextRender(() => this.nameInput()?.nativeElement.focus());
    watchAddNewOption(this.form.controls.relationshipId, inject(DestroyRef), () => this.addingRelationship.set(true));
  }

  ngOnInit(): void {
    const m = this.member();
    this.form.reset({ name: m?.name ?? '', relationshipId: m?.relationshipId ?? '', dateOfBirth: m?.dateOfBirth ?? '' });
  }

  isSelfDisabled(id: string): boolean {
    return id === SELF_RELATIONSHIP_ID && this.selfTaken();
  }

  /** New relationship from the dialog: select it. */
  onRelationshipAdded(item: LookupItem): void {
    this.form.controls.relationshipId.setValue(item.id);
    this.form.controls.relationshipId.markAsDirty();
    this.closeAddRelationship();
  }

  /** Dialog closed: keyboard focus back on the select. */
  closeAddRelationship(): void {
    this.addingRelationship.set(false);
    this.relationshipSelect()?.nativeElement.focus();
  }

  save(): void {
    // A confirm on top ("Discard changes?") owns the keyboard — never submit from behind it
    if (this.ui.confirmState() || this.addingRelationship()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const id = this.member()?.id;
    this.saving.set(true);
    this.formError.set('');
    (id ? this.service.update(id, value) : this.service.create(value)).subscribe({
      next: saved => {
        this.saving.set(false);
        this.ui.success(id ? 'Member updated.' : 'Member added.');
        this.saved.emit(saved);
      },
      error: err => {
        this.saving.set(false);
        if (id && err instanceof HttpErrorResponse && err.status === 404) { this.missing.emit(errorMessage(err)); return; }
        this.formError.set(errorMessage(err));
      },
    });
  }

  /** Cancel, ✕, backdrop and Esc: ask first when something was typed. */
  async close(): Promise<void> {
    if (this.saving()) return;
    if (this.form.dirty && !(await this.ui.confirm('Discard changes?', 'What you typed will be lost.', 'Discard'))) return;
    this.closed.emit();
  }

  onEscape(): void {
    // Esc on the confirm dialog / the "+ Add new" dialog belongs to that dialog
    if (!this.ui.confirmState() && !this.addingRelationship()) void this.close();
  }
}
