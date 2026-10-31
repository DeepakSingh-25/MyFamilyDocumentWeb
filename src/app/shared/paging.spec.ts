import { lastPageIfPastEnd, pagingParams, toId, toPage, toPageSize, toSearch } from './paging';

describe('paging helpers (spec 010 §B.1)', () => {
  it('toPage accepts 1..2147483647, anything else is page 1', () => {
    expect(toPage('3')).toBe(3);
    expect(toPage('2147483647')).toBe(2147483647);
    expect([toPage('2147483648'), toPage('99999999999999'), toPage('1e20'), toPage('0'), toPage('-2'), toPage('2.5'), toPage('abc'), toPage(undefined)])
      .toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('toId accepts a GUID (lower-cased), anything else is empty = all (spec 014)', () => {
    expect(toId('10000000-0000-0000-0000-000000000003')).toBe('10000000-0000-0000-0000-000000000003');
    expect(toId(' 3F2504E0-4F89-11D3-9A0C-0305E82C3301 ')).toBe('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
    expect([toId('4'), toId('0'), toId('new'), toId('3f2504e0-4f89-11d3-9a0c-0305e82c330'), toId('3f2504e04f8911d39a0c0305e82c3301'), toId(''), toId(null)])
      .toEqual(['', '', '', '', '', '', '']);
  });

  it('toPageSize only allows the offered sizes', () => {
    expect([toPageSize('25'), toPageSize('50'), toPageSize('7'), toPageSize('500'), toPageSize(undefined)]).toEqual([25, 50, 10, 10, 10]);
  });

  it('toSearch keeps at most 100 characters', () => {
    expect(toSearch('a'.repeat(150)).length).toBe(100);
    expect(toSearch(undefined)).toBe('');
  });

  it('pagingParams leaves the defaults out', () => {
    expect(pagingParams(1, 10)).toEqual({});
    expect(pagingParams(3, 25)).toEqual({ page: 3, size: 25 });
  });

  it('lastPageIfPastEnd only when the page is empty and past the end', () => {
    expect(lastPageIfPastEnd(99, 0, 6)).toBe(6);
    expect(lastPageIfPastEnd(1, 0, 0)).toBeNull();
    expect(lastPageIfPastEnd(3, 2, 6)).toBeNull();
  });
});
