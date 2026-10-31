import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { APP_RETURN_ROOTS, DOCUMENT_RETURN_ROOTS, safeDocumentReturnUrl, safeReturnUrl, withoutPage } from './safe-return-url';

describe('safeReturnUrl (spec 010 §B.4)', () => {
  let router: Router;
  const check = (value: string | null | undefined, roots = DOCUMENT_RETURN_ROOTS) => {
    const tree = safeReturnUrl(router, value, roots);
    return tree ? router.serializeUrl(tree) : null;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
  });

  it('accepts our list URLs with their query string', () => {
    expect(check('/documents?page=3')).toBe('/documents?page=3');
    expect(check('/documents?search=aadhaar&category=1&page=2&size=20')).toBe('/documents?search=aadhaar&category=1&page=2&size=20');
    expect(check('/medical-documents?member=4')).toBe('/medical-documents?member=4');
    expect(check('/family-members/5')).toBe('/family-members/5');
  });

  it.each([
    '/documentsX', '//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)',
    'documents', '/dashboard', '/(popup:documents)', '', null, undefined,
  ])('rejects %s', value => {
    expect(check(value)).toBeNull();
  });

  it('lets the login page return to any signed-in page, but not elsewhere', () => {
    expect(check('/dashboard', APP_RETURN_ROOTS)).toBe('/dashboard');
    expect(check('/account', APP_RETURN_ROOTS)).toBe('/account');
    expect(check('/login', APP_RETURN_ROOTS)).toBeNull();
    expect(check('//evil.example', APP_RETURN_ROOTS)).toBeNull();
  });

  it('the document form never returns to a form page', () => {
    const form = (value: string) => {
      const tree = safeDocumentReturnUrl(router, value);
      return tree ? router.serializeUrl(tree) : null;
    };
    expect(form('/documents?page=3')).toBe('/documents?page=3');
    expect(form('/medical-documents')).toBe('/medical-documents');
    expect(form('/family-members/5')).toBe('/family-members/5');
    expect(form('/documents/new')).toBeNull();
    expect(form('/documents/new?member=5')).toBeNull();
    expect(form('/documents/12/edit')).toBeNull();
    expect(form('/documents/12/edit?returnUrl=%2Fdocuments')).toBeNull();
    expect(form('//evil.example')).toBeNull();
  });

  it('withoutPage drops only the page param', () => {
    const tree = safeReturnUrl(router, '/documents?category=1&page=3&size=20', DOCUMENT_RETURN_ROOTS)!;
    expect(router.serializeUrl(withoutPage(router, tree))).toBe('/documents?category=1&size=20');
    expect(router.serializeUrl(tree)).toBe('/documents?category=1&page=3&size=20');
  });
});
