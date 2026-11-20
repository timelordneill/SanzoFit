import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Color, toRgbString } from '../../models/color';
import { WARDROBE_ITEM_TYPES, WardrobeItemType } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { ImageResizeService } from '../../services/image-resize.service';
import { WardrobeService } from '../../services/wardrobe.service';

/** Files larger than this are rejected before resizing. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-wardrobe-item-create',
  styleUrl: './wardrobe-item-create.scss',
  templateUrl: './wardrobe-item-create.html',
})
export class WardrobeItemCreate {
  private readonly colorsService = inject(ColorsService);
  private readonly wardrobeService = inject(WardrobeService);
  private readonly imageResizer = inject(ImageResizeService);
  private readonly router = inject(Router);

  protected readonly types = WARDROBE_ITEM_TYPES;
  protected readonly rgb = toRgbString;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    type: ['' as WardrobeItemType | '', Validators.required],
    colors: [[] as string[], Validators.required],
  });

  /** Hex values of the selected colors, in the order they were picked. */
  private readonly selectedHexes = toSignal(this.form.controls.colors.valueChanges, {
    initialValue: this.form.controls.colors.value,
  });

  protected readonly selectedColors = computed(() => {
    const byHex = this.colorsService.byHex();
    return this.selectedHexes()
      .map((hex) => byHex.get(hex))
      .filter((color): color is Color => !!color);
  });

  protected readonly search = signal('');

  protected readonly visibleColors = computed(() => {
    const term = this.search().trim().toLowerCase();
    const colors = this.colorsService.colors();
    return term ? colors.filter((c) => c.name.toLowerCase().includes(term)) : colors;
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** The chosen photo as a resized data URL, or null when there is none. */
  protected readonly image = signal<string | null>(null);
  protected readonly processingImage = signal(false);
  protected readonly imageError = signal<string | null>(null);

  constructor() {
    this.colorsService.loadColors();
  }

  protected async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow choosing the same file again after removing it
    if (!file) {
      return;
    }

    this.imageError.set(null);
    if (!file.type.startsWith('image/')) {
      this.imageError.set('That file is not an image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      this.imageError.set('That image is too large (max 15 MB).');
      return;
    }

    this.processingImage.set(true);
    try {
      this.image.set(await this.imageResizer.toDataUrl(file));
    } catch {
      this.imageError.set('Could not read that image. Try a JPEG or PNG.');
    } finally {
      this.processingImage.set(false);
    }
  }

  protected removeImage(): void {
    this.image.set(null);
    this.imageError.set(null);
  }

  protected isSelected(color: Color): boolean {
    return this.selectedHexes().includes(color.hex);
  }

  protected toggleColor(color: Color): void {
    const control = this.form.controls.colors;
    const current = control.value;
    control.setValue(
      current.includes(color.hex)
        ? current.filter((hex) => hex !== color.hex)
        : [...current, color.hex],
    );
    control.markAsTouched();
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, type, colors } = this.form.getRawValue();
    const image = this.image();
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.wardrobeService.create({
        name: name.trim(),
        type: type as WardrobeItemType,
        colors,
        ...(image ? { image } : {}),
      });
      await this.router.navigateByUrl('/wardrobe');
    } catch {
      this.error.set('Could not save the item. Is the API running (npm start)?');
    } finally {
      this.saving.set(false);
    }
  }
}
