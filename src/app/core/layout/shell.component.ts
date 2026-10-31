import { Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountService } from '../services/account.service';
import { AuthService } from '../services/auth.service';
import { CategoryService } from '../services/category.service';
import { RelationshipService } from '../services/relationship.service';
import { ThemeService } from '../services/theme.service';
import { UiService } from '../services/ui.service';
import { InitialsPipe } from '../../shared/initials.pipe';

interface NavItem { path: string; label: string; icon: string; }

@Component({
  selector: 'app-shell',
  imports: [InitialsPipe, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  readonly theme = inject(ThemeService);
  private readonly account = inject(AccountService);
  readonly photoUrl = this.account.photoUrl;

  readonly mobileOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly userName = computed(() => this.auth.currentUser()?.fullName ?? '');

  readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' },
    { path: '/family-members', label: 'Family Members', icon: 'bi-people' },
    { path: '/documents', label: 'All Documents', icon: 'bi-folder2-open' },
    { path: '/medical-documents', label: 'Medical Records', icon: 'bi-heart-pulse' },
    { path: '/categories', label: 'Categories', icon: 'bi-tags' },
    { path: '/relationships', label: 'Relationships', icon: 'bi-diagram-3' },
    { path: '/account', label: 'My Account', icon: 'bi-person-circle' },
  ];

  constructor() {
    // Saare app pages yahi categories use karte hain (ek hi baar load). Logout par shell hatta hai —
    // tab user ki apni categories / relationships memory se saaf, taaki agla user unhe na dekhe (spec 013)
    const categories = inject(CategoryService);
    const relationships = inject(RelationshipService);
    categories.load();
    // Header avatar ki photo; logout par shell hatte hi purani photo memory se saaf
    this.account.loadPhoto();
    // Night mode sirf app pages par — login / sign-up hamesha day mode
    this.theme.setInApp(true);
    inject(DestroyRef).onDestroy(() => {
      this.theme.setInApp(false);
      this.account.clearPhoto();
      categories.clear();
      relationships.clear();
    });
  }

  closeMobile(): void { this.mobileOpen.set(false); }

  closeMenu(): void { this.menuOpen.set(false); }

  /** User dropdown bahar click ya Escape par band. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !(event.target as HTMLElement).closest('.user-menu')) this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeMenu(); }

  async logout(): Promise<void> {
    const ok = await this.ui.confirm('Log out?', 'You will need to sign in again to see your documents.', 'Log out');
    if (ok) this.auth.logout();
  }
}
