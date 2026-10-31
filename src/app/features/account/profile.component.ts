import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { checkPhoto, PHOTO_ACCEPT_ATTR, PHOTO_TYPES_TEXT } from '../../core/file-rules';
import { errorMessage } from '../../core/http/error-message';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { Profile } from '../../shared/models/models';
import { InitialsPipe } from '../../shared/initials.pipe';

/** Full name: trimmed value khaali → required; 100 se lamba → maxlength (same error keys template use karta hai). */
function trimmedName(control: AbstractControl<string>): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (!value) return { required: true };
  return value.length > 100 ? { maxlength: { requiredLength: 100, actualLength: value.length } } : null;
}

@Component({
  selector: 'app-profile',
  imports: [InitialsPipe, ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './account.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ui = inject(UiService);
  private readonly account = inject(AccountService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  readonly profile = signal<Profile | null>(null);
  readonly loadError = signal('');
  readonly registrationOpen = signal(false);
  readonly editing = signal(false);
  readonly savingName = signal(false);
  readonly nameError = signal('');

  // Photo — header bhi isi signal se dikhata hai
  readonly photoUrl = this.account.photoUrl;
  readonly photoAccept = PHOTO_ACCEPT_ATTR;
  readonly photoTypes = PHOTO_TYPES_TEXT;
  readonly savingPhoto = signal(false);
  readonly photoError = signal('');
  /** Photo avatar ke upar drag ho rahi hai. */
  readonly dragging = signal(false);

  // API ki tarah trimmed value par check: sirf spaces = required, aur 100 ki limit trim ke baad
  readonly nameForm = this.fb.nonNullable.group({
    fullName: ['', [trimmedName]],
  });

  ngOnInit(): void {
    this.load();
    // Sirf info pill — fail ho to "Closed" hi dikhega
    this.auth.registrationOpen().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: open => this.registrationOpen.set(open), error: () => {} });
  }

  load(): void {
    this.loadError.set('');
    this.profile.set(null);
    this.account.profile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => this.applyProfile(p),
      // Spinner ki jagah error + Retry
      error: err => this.loadError.set(errorMessage(err)),
    });
  }

  startEdit(): void {
    const p = this.profile();
    if (!p) return;
    this.nameForm.reset({ fullName: p.fullName });
    this.nameError.set('');
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.nameError.set('');
  }

  saveName(): void {
    if (this.nameForm.invalid) { this.nameForm.markAllAsTouched(); return; }
    this.savingName.set(true);
    this.nameError.set('');
    this.account.updateProfile(this.nameForm.getRawValue().fullName).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => {
        this.savingName.set(false);
        this.editing.set(false);
        this.applyProfile(p);
        this.ui.success('Profile updated.');
      },
      // Purana naam card mein bana rehta hai; error input ke neeche
      error: err => { this.savingName.set(false); this.nameError.set(errorMessage(err)); },
    });
  }

  onPhotoPicked(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = ''; // same file dobara chunne par bhi change event aaye
    if (file) void this.uploadPhoto(file);
  }

  onDragOver(event: DragEvent): void {
    // Sirf files ke liye drop allow (text / link nahi)
    if (!event.dataTransfer?.types.includes('Files') || this.savingPhoto()) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    // Andar ke child element par jaane se bhi dragleave aata hai — bahar nikalne par hi band
    const zone = event.currentTarget as HTMLElement;
    if (!zone.contains(event.relatedTarget as Node | null)) this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && !this.savingPhoto()) void this.uploadPhoto(file);
  }

  private async uploadPhoto(file: File): Promise<void> {
    this.photoError.set('');
    const error = await checkPhoto(file);
    if (error) { this.photoError.set(error); return; }
    this.savingPhoto.set(true);
    // takeUntilDestroyed nahi: page chhodne par bhi server ka jawab header ki photo tak pahunche (handlers sirf signals badalte hain)
    this.account.uploadPhoto(file).subscribe({
      next: p => { this.savingPhoto.set(false); this.applyProfile(p); this.ui.success('Photo updated.'); },
      error: err => { this.savingPhoto.set(false); this.photoError.set(errorMessage(err)); },
    });
  }

  async removePhoto(): Promise<void> {
    const ok = await this.ui.confirm('Remove photo?', 'Your initial will be shown instead.', 'Remove');
    if (!ok) return;
    this.savingPhoto.set(true);
    this.photoError.set('');
    this.account.deletePhoto().subscribe({
      next: p => { this.savingPhoto.set(false); this.applyProfile(p); this.ui.success('Photo removed.'); },
      error: err => { this.savingPhoto.set(false); this.photoError.set(errorMessage(err)); },
    });
  }

  /** Card + header dono API ke data se. */
  private applyProfile(p: Profile): void {
    this.profile.set(p);
    // Header ki photo load fail hui ho (404 ke alawa) to yahan dobara koshish
    if (p.hasPhoto && !this.photoUrl()) this.account.loadPhoto();
    this.auth.currentUser.set({ id: p.id, fullName: p.fullName, email: p.email, createdOn: p.createdOn });
  }
}
