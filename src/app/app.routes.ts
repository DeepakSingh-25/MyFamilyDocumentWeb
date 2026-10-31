import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // Public pages (no sidebar)
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent), title: 'Login' },
  { path: 'signup', canActivate: [guestGuard], loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent), title: 'Create Account' },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), title: 'Forgot Password' },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent), title: 'Reset Password' },

  // App pages (sidebar layout) — signed-in users only
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), title: 'Dashboard' },
      { path: 'family-members', loadComponent: () => import('./features/family-members/member-list/member-list.component').then(m => m.MemberListComponent), title: 'Family Members' },
      { path: 'family-members/:id', loadComponent: () => import('./features/family-members/member-documents/member-documents.component').then(m => m.MemberDocumentsComponent), title: 'Member Documents' },
      { path: 'documents', loadComponent: () => import('./features/documents/document-list/document-list.component').then(m => m.DocumentListComponent), title: 'All Documents' },
      { path: 'documents/new', loadComponent: () => import('./features/documents/document-form/document-form.component').then(m => m.DocumentFormComponent), title: 'Add Document' },
      { path: 'documents/:id/edit', loadComponent: () => import('./features/documents/document-form/document-form.component').then(m => m.DocumentFormComponent), title: 'Edit Document' },
      { path: 'medical-documents', loadComponent: () => import('./features/medical-documents/medical-list.component').then(m => m.MedicalListComponent), title: 'Medical Records' },
      { path: 'categories', loadComponent: () => import('./features/lists/lists.component').then(m => m.ListsComponent), data: { kind: 'category' }, title: 'Document Categories' },
      { path: 'relationships', loadComponent: () => import('./features/lists/lists.component').then(m => m.ListsComponent), data: { kind: 'relationship' }, title: 'Relationships' },
      { path: 'lists', pathMatch: 'full', redirectTo: 'categories' },
      { path: 'account', pathMatch: 'full', redirectTo: 'account/profile' },
      { path: 'account/profile', loadComponent: () => import('./features/account/profile.component').then(m => m.ProfileComponent), title: 'My Profile' },
      { path: 'account/change-password', loadComponent: () => import('./features/account/change-password.component').then(m => m.ChangePasswordComponent), title: 'Change Password' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
