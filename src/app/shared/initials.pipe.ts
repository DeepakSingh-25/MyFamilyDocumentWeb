import { Pipe, PipeTransform } from '@angular/core';

/** Avatar ke initials: pehle aur aakhri shabd ka pehla akshar — "Deepak Singh" → "DS", "Deepak" → "D". */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string | null | undefined): string {
    return initials(name);
  }
}
