import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ADD_NEW_ID } from './constants';

/**
 * "+ Add new…" option of a category / relationship select (spec 013). When it is picked, the select gets its
 * old value back (and its old pristine state, so closing the form does not ask "Discard changes?" for nothing)
 * and `open()` shows the quick-add dialog. Note: arrowing through a closed select fires `change` in some
 * browsers, so arrowing onto the last option also opens the dialog — accepted, Cancel puts everything back.
 */
export function watchAddNewOption(control: FormControl<string>, destroyRef: DestroyRef, open: () => void): void {
  let last = control.value;
  let lastPristine = control.pristine;
  control.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(id => {
    if (id !== ADD_NEW_ID) {
      last = id;
      lastPristine = control.pristine;
      return;
    }
    const wasPristine = lastPristine;
    control.setValue(last);
    if (wasPristine) control.markAsPristine();
    lastPristine = wasPristine;
    open();
  });
}
