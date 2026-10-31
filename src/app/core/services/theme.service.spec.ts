import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;
  const applied = () => root.getAttribute('data-theme');

  function create(saved: string | null): ThemeService {
    localStorage.clear();
    if (saved) localStorage.setItem('fd_theme', saved);
    const theme = TestBed.inject(ThemeService);
    TestBed.tick();
    return theme;
  }

  afterEach(() => {
    localStorage.clear();
    root.removeAttribute('data-theme');
    root.removeAttribute('data-bs-theme');
  });

  it('starts in day mode on the first visit', () => {
    const theme = create(null);
    theme.setInApp(true);
    TestBed.tick();

    expect(theme.dark()).toBe(false);
    expect(applied()).toBe('light');
    expect(localStorage.getItem('fd_theme')).toBeNull();
  });

  it('keeps login / sign-up in day mode even when night mode was saved', () => {
    const theme = create('dark');

    expect(theme.dark()).toBe(true);
    expect(applied()).toBe('light');
    expect(root.getAttribute('data-bs-theme')).toBe('light');
  });

  it('opens the app in night mode when the user left it in night mode', () => {
    const theme = create('dark');
    theme.setInApp(true);
    TestBed.tick();

    expect(applied()).toBe('dark');
    expect(root.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('goes back to day mode on leaving the app (logout) but keeps the saved choice', () => {
    const theme = create('dark');
    theme.setInApp(true);
    TestBed.tick();
    theme.setInApp(false);
    TestBed.tick();

    expect(applied()).toBe('light');
    expect(localStorage.getItem('fd_theme')).toBe('dark');
  });

  it('saves the toggled choice for the next visit', () => {
    const theme = create(null);
    theme.setInApp(true);
    theme.toggle();
    TestBed.tick();

    expect(applied()).toBe('dark');
    expect(localStorage.getItem('fd_theme')).toBe('dark');
  });
});
