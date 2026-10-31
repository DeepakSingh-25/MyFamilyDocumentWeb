import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Form-group validator: the two named controls must hold the same value. */
export function matchValidator(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null =>
    group.get(field)?.value === group.get(confirmField)?.value ? null : { mismatch: true };
}

/** `required` that also rejects text made only of spaces (the API trims and then checks). */
export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

/** At least 8 chars with an uppercase letter, a lowercase letter and a digit. */
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
