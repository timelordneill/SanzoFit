import { Component, effect, ElementRef, input, output, viewChild } from '@angular/core';

let nextId = 0;

/**
 * A modal "are you sure?" popup built on the native `<dialog>` element, which
 * provides the backdrop, focus trapping and Esc-to-close.
 *
 * The host controls visibility with `[open]` and closes it in response to
 * `(confirm)` / `(cancel)`. Pressing Esc or clicking the backdrop emits `cancel`.
 * Extra explanation goes in the content: `<app-confirm-dialog>Text…</app-confirm-dialog>`.
 */
@Component({
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.scss',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  /** Styles the confirm button as destructive (red). */
  readonly danger = input(false);
  /** Disables the buttons while the host performs the action. */
  readonly busy = input(false);
  /** Error to show inside the dialog, e.g. when the action failed. */
  readonly error = input<string | null>(null);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  /** Unique id linking the dialog to its title for screen readers. */
  protected readonly titleId = `confirm-dialog-title-${nextId++}`;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        // showModal() is missing in some environments (e.g. jsdom in unit tests).
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      } else if (!this.open() && dialog.open) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.removeAttribute('open');
        }
      }
    });
  }

  /** Esc closes a native dialog by itself; report it so the host's state stays in sync. */
  protected onNativeCancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) {
      this.cancel.emit();
    }
  }

  /** Clicks on the dialog element itself (not its content) are clicks on the backdrop. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement && !this.busy()) {
      this.cancel.emit();
    }
  }
}
