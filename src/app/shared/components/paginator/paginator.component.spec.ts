import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent (spec 010 §B.1)', () => {
  let fixture: ComponentFixture<PaginatorComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const numbers = () => [...el().querySelectorAll('button.page-num, .gap')].map(b => b.textContent?.trim());
  const byLabel = (label: string) => el().querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

  async function show(page: number, totalCount: number, pageSize = 10, disabled = false): Promise<void> {
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pageSize', pageSize);
    fixture.componentRef.setInput('totalCount', totalCount);
    fixture.componentRef.setInput('totalPages', Math.ceil(totalCount / pageSize));
    fixture.componentRef.setInput('disabled', disabled);
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(PaginatorComponent);
  });

  it('shows the range, all pages when 7 or fewer, and marks the current page', async () => {
    await show(2, 57);

    expect(text()).toContain('Showing 11–20 of 57');
    expect(numbers()).toEqual(['1', '2', '3', '4', '5', '6']);
    const current = el().querySelector('[aria-current="page"]') as HTMLButtonElement;
    expect(current.textContent?.trim()).toBe('2');
    expect(current.getAttribute('aria-label')).toBe('Page 2');
    expect(current.classList).toContain('active');
    expect(el().querySelector('nav')?.getAttribute('aria-label')).toBe('Documents pages');
  });

  it('shows the last partial page range', async () => {
    await show(3, 23);
    expect(text()).toContain('Showing 21–23 of 23');
  });

  it.each([
    [1, ['1', '2', '3', '4', '5', '…', '20']],
    [10, ['1', '…', '9', '10', '11', '…', '20']],
    [19, ['1', '…', '16', '17', '18', '19', '20']],
  ])('uses "…" for gaps (page %i of 20)', async (page, expected) => {
    await show(page, 200);
    expect(numbers()).toEqual(expected);
  });

  it('disables Previous on the first page and Next on the last page', async () => {
    await show(1, 30);
    expect(byLabel('Previous page').getAttribute('aria-disabled')).toBe('true');
    expect(byLabel('Next page').hasAttribute('aria-disabled')).toBe(false);

    await show(3, 30);
    expect(byLabel('Previous page').hasAttribute('aria-disabled')).toBe(false);
    expect(byLabel('Next page').getAttribute('aria-disabled')).toBe('true');
  });

  it('emits the page for number, Previous and Next clicks', async () => {
    const pages: number[] = [];
    fixture.componentInstance.pageChange.subscribe(p => pages.push(p));
    await show(3, 60);

    byLabel('Page 5').click();
    byLabel('Previous page').click();
    byLabel('Next page').click();
    byLabel('Page 3').click(); // current page: nothing

    expect(pages).toEqual([5, 2, 4]);
  });

  it('emits a new page size', async () => {
    const sizes: number[] = [];
    fixture.componentInstance.pageSizeChange.subscribe(s => sizes.push(s));
    await show(1, 60);

    const select = el().querySelector('select') as HTMLSelectElement;
    expect([...select.options].map(o => o.value)).toEqual(['10', '25', '50']);
    expect(el().querySelector(`label[for="${select.id}"]`)?.textContent).toContain('Rows');
    select.value = '25';
    select.dispatchEvent(new Event('change'));

    expect(sizes).toEqual([25]);
  });

  it('shows "Page 3 of 6" for phones', async () => {
    await show(3, 57);
    expect(el().querySelector('.phone-page')?.textContent?.trim()).toBe('Page 3 of 6');
  });

  it('is disabled as a whole while loading (aria-disabled), and ignores clicks and size changes', async () => {
    const pages: number[] = [];
    const sizes: number[] = [];
    fixture.componentInstance.pageChange.subscribe(p => pages.push(p));
    fixture.componentInstance.pageSizeChange.subscribe(s => sizes.push(s));
    await show(2, 57, 10, true);

    const buttons = [...el().querySelectorAll('button')];
    expect(buttons.every(b => b.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(buttons.some(b => b.disabled)).toBe(false);
    byLabel('Page 3').click();
    byLabel('Next page').click();
    const select = el().querySelector('select') as HTMLSelectElement;
    expect(select.getAttribute('aria-disabled')).toBe('true');
    select.value = '50';
    select.dispatchEvent(new Event('change'));

    expect(pages).toEqual([]);
    expect(sizes).toEqual([]);
    expect(select.value).toBe('10');
  });

  it('keeps keyboard focus on the pressed page button while the page loads', async () => {
    fixture.componentInstance.pageChange.subscribe(p => {
      fixture.componentRef.setInput('page', p);
      fixture.componentRef.setInput('disabled', true);
    });
    document.body.appendChild(el());
    await show(5, 60);

    const next = byLabel('Next page');
    next.focus();
    next.click();
    await fixture.whenStable();

    expect(byLabel('Next page').disabled).toBe(false);
    expect(byLabel('Next page').getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(byLabel('Next page'));

    const page3 = byLabel('Page 3');
    fixture.componentRef.setInput('disabled', false);
    await fixture.whenStable();
    page3.focus();
    page3.click();
    await fixture.whenStable();
    expect(page3.disabled).toBe(false);
    expect(document.activeElement).toBe(page3);
    el().remove();
  });

  it('keeps Previous / Next visible but disabled with one page, and shows nothing with no rows', async () => {
    await show(1, 4);
    expect(text()).toContain('Showing 1–4 of 4');
    expect(el().querySelector('select')).not.toBeNull();
    expect(byLabel('Previous page').getAttribute('aria-disabled')).toBe('true');
    expect(byLabel('Next page').getAttribute('aria-disabled')).toBe('true');
    expect(text()).toContain('Previous');
    expect(text()).toContain('Next');

    await show(1, 0);
    expect(el().querySelector('.paginator')).toBeNull();
  });
});
