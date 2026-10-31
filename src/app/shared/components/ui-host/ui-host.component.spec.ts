import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiService } from '../../../core/services/ui.service';
import { UiHostComponent } from './ui-host.component';

describe('UiHostComponent loader', () => {
  let fixture: ComponentFixture<UiHostComponent>;
  let ui: UiService;
  const overlay = () => (fixture.nativeElement as HTMLElement).querySelector('.loader-overlay');
  const status = () => (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');

  beforeEach(async () => {
    fixture = TestBed.createComponent(UiHostComponent);
    ui = TestBed.inject(UiService);
    await fixture.whenStable();
  });

  it('is hidden while ui.loading is false, with an empty status region already in place', () => {
    expect(overlay()).toBeNull();
    expect(status()).not.toBeNull();
    expect(status()?.textContent?.trim()).toBe('');
  });

  it('shows the overlay with the ring spinner and announces "Loading" while loading', async () => {
    ui.loading.set(true);
    await fixture.whenStable();

    expect(overlay()?.querySelector('.loader-spinner[aria-hidden="true"]')).not.toBeNull();
    expect(status()?.textContent).toContain('Loading');
  });

  it('goes away again when loading ends', async () => {
    ui.loading.set(true);
    await fixture.whenStable();
    ui.loading.set(false);
    await fixture.whenStable();

    expect(overlay()).toBeNull();
  });
});

describe('UiHostComponent toasts', () => {
  let fixture: ComponentFixture<UiHostComponent>;
  let ui: UiService;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(UiHostComponent);
    ui = TestBed.inject(UiService);
    await fixture.whenStable();
  });

  // Fake timers sirf jahan chahiye — whenStable() fake timers ke saath atak jata hai
  afterEach(() => vi.useRealTimers());

  it('shows a success toast with its title and text inside the polite live region', async () => {
    expect(el().querySelector('.toast-area')?.getAttribute('aria-live')).toBe('polite');

    ui.success('Please log in with your new password.', 'Password changed');
    await fixture.whenStable();

    const toast = el().querySelector('.toast-area .toast-msg')!;
    expect(toast.getAttribute('role')).toBeNull();
    expect(toast.classList).not.toContain('error');
    expect(toast.querySelector('.toast-title')?.textContent).toBe('Password changed');
    expect(toast.querySelector('.toast-text')?.textContent).toBe('Please log in with your new password.');
    expect(toast.querySelector('.bi-check-lg')).not.toBeNull();
  });

  it('shows an error toast as an alert with the default title', async () => {
    ui.error('Could not save.');
    await fixture.whenStable();

    const toast = el().querySelector('.toast-msg')!;
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.classList).toContain('error');
    expect(toast.querySelector('.toast-title')?.textContent).toBe('Something went wrong');
  });

  it('closes when the × button is clicked', async () => {
    ui.success('Saved.');
    await fixture.whenStable();

    el().querySelector<HTMLButtonElement>('.toast-close')!.click();
    await fixture.whenStable();

    expect(el().querySelector('.toast-msg')).toBeNull();
  });

  it('goes away by itself after toastMs', async () => {
    vi.useFakeTimers();
    ui.success('Saved.');
    vi.advanceTimersByTime(ui.toastMs - 1);
    expect(ui.toasts().length).toBe(1);

    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    await fixture.whenStable();

    expect(ui.toasts()).toEqual([]);
    expect(el().querySelector('.toast-msg')).toBeNull();
  });
});
