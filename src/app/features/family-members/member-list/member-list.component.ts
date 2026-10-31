import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/error-message';
import { MemberService } from '../../../core/services/member.service';
import { UiService } from '../../../core/services/ui.service';
import { FamilyMember } from '../../../shared/models/models';
import { confirmMemberDelete } from '../confirm-member-delete';
import { MemberFormComponent } from '../member-form/member-form.component';
import { InitialsPipe } from '../../../shared/initials.pipe';

@Component({
  selector: 'app-member-list',
  imports: [InitialsPipe, RouterLink, DatePipe, MemberFormComponent],
  templateUrl: './member-list.component.html',
  styleUrl: './member-list.component.css',
})
export class MemberListComponent implements OnInit {
  private readonly service = inject(MemberService);
  private readonly ui = inject(UiService);

  readonly members = signal<FamilyMember[]>([]);
  readonly loading = signal(true);
  /** Set when the list could not be loaded — the empty state is shown only after a successful load. */
  readonly loadError = signal('');
  readonly formOpen = signal(false);
  readonly editing = signal<FamilyMember | null>(null);
  private loadRequest = 0;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    // Spinner only for the first load / Retry — a refresh after save keeps the cards on screen
    if (!this.members().length || this.loadError()) this.loading.set(true);
    this.loadError.set('');
    // Only the latest request may set the list (delete then add quickly → two reloads in flight)
    const request = ++this.loadRequest;
    this.service.list().subscribe({
      next: list => { if (request !== this.loadRequest) return; this.members.set(list); this.loading.set(false); },
      error: err => { if (request !== this.loadRequest) return; this.loading.set(false); this.loadError.set(errorMessage(err)); },
    });
  }

  openForm(member?: FamilyMember): void {
    this.editing.set(member ?? null);
    this.formOpen.set(true);
  }

  onSaved(): void {
    this.formOpen.set(false);
    this.load();
  }

  /** Edited member was removed in another tab. */
  onMissing(message: string): void {
    this.formOpen.set(false);
    this.ui.error(message);
    this.load();
  }

  async remove(member: FamilyMember): Promise<void> {
    if (!(await confirmMemberDelete(this.ui, member))) return;
    this.ui.loading.set(true);
    this.service.delete(member.id).subscribe({
      next: () => { this.ui.loading.set(false); this.ui.success('Member deleted.'); this.load(); },
      error: err => {
        this.ui.loading.set(false);
        this.ui.error(errorMessage(err));
        if (err instanceof HttpErrorResponse && err.status === 404) this.load();
      },
    });
  }
}
