import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      title="Delete it?"
      confirmLabel="Delete"
      [danger]="true"
      [open]="open()"
      [busy]="busy()"
      (confirm)="confirmed = confirmed + 1"
      (cancel)="cancelled = cancelled + 1"
    >
      This can't be undone.
    </app-confirm-dialog>
  `,
})
class Host {
  readonly open = signal(false);
  readonly busy = signal(false);
  confirmed = 0;
  cancelled = 0;
}

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let dialog: HTMLDialogElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
    dialog = fixture.nativeElement.querySelector('dialog');
  });

  async function setOpen(open: boolean) {
    host.open.set(open);
    await fixture.whenStable();
  }

  it('opens and closes with the open input', async () => {
    expect(dialog.open).toBe(false);
    await setOpen(true);
    expect(dialog.open).toBe(true);
    await setOpen(false);
    expect(dialog.open).toBe(false);
  });

  it('shows the title, message and labels', async () => {
    await setOpen(true);
    expect(dialog.querySelector('.title')?.textContent).toBe('Delete it?');
    expect(dialog.querySelector('.message')?.textContent?.trim()).toBe("This can't be undone.");
    expect(dialog.querySelector('.confirm')?.textContent?.trim()).toBe('Delete');
    expect(dialog.querySelector('.confirm')?.classList).toContain('danger');
  });

  it('emits confirm and cancel from the buttons', async () => {
    await setOpen(true);
    dialog.querySelector<HTMLButtonElement>('.confirm')!.click();
    dialog.querySelector<HTMLButtonElement>('.cancel')!.click();
    expect(host.confirmed).toBe(1);
    expect(host.cancelled).toBe(1);
  });

  it('treats Esc (native cancel) and backdrop clicks as cancel', async () => {
    await setOpen(true);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host.cancelled).toBe(2);
  });

  it('disables the buttons while busy', async () => {
    await setOpen(true);
    host.busy.set(true);
    await fixture.whenStable();
    expect(dialog.querySelector<HTMLButtonElement>('.confirm')!.disabled).toBe(true);
    expect(dialog.querySelector<HTMLButtonElement>('.cancel')!.disabled).toBe(true);
  });
});
