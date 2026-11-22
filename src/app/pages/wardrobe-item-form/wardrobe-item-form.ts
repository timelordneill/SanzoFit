import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ImageColorPicker } from '../../components/image-color-picker/image-color-picker';
import { PhotoColorSuggestions } from '../../components/photo-color-suggestions/photo-color-suggestions';
import { Color, toCssColor } from '../../models/color';
import { WARDROBE_ITEM_TYPES, WardrobeItemType } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { ImageResizeService } from '../../services/image-resize.service';
import {
  WardrobeItemNotFoundError,
  WardrobeService,
  WardrobeStorageFullError,
} from '../../services/wardrobe.service';

/** Files larger than this are rejected before resizing. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * The form to create a wardrobe item (`/wardrobe/new`) or edit one
 * (`/wardrobe/:id/edit`, where the route's `:id` puts it in edit mode).
 */
@Component({
  imports: [ReactiveFormsModule, RouterLink, ImageColorPicker, PhotoColorSuggestions],
  selector: 'app-wardrobe-item-form',
  styleUrl: './wardrobe-item-form.scss',
  templateUrl: './wardrobe-item-form.html',
})
export class WardrobeItemForm {
  private readonly colorsService = inject(ColorsService);
  private readonly wardrobeService = inject(WardrobeService);
  private readonly imageResizer = inject(ImageResizeService);
  private readonly router = inject(Router);

  /** Route parameter `:id` of the item to edit; absent when creating a new item. */
  readonly id = input<string>();

  protected readonly isEdit = computed(() => this.id() !== undefined);

  /** Where Save (after success), Cancel and the back link go. */
  protected readonly returnUrl = computed(() => {
    const id = this.id();
    return id === undefined ? '/wardrobe' : `/wardrobe/${id}`;
  });

  /** Edit mode loads the item first; create mode is ready immediately. */
  protected readonly loadState = signal<'ready' | 'loading' | 'not-found' | 'error'>('ready');

  protected readonly types = WARDROBE_ITEM_TYPES;
  protected readonly swatchColor = toCssColor;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    type: ['' as WardrobeItemType | '', Validators.required],
    colors: [[] as string[], Validators.required],
  });

  /** Hex values of the selected colors, in the order they were picked. */
  protected readonly selectedHexes = toSignal(this.form.controls.colors.valueChanges, {
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

  /** Guards against an older, slower load overwriting a newer one. */
  private loadRun = 0;

  constructor() {
    this.colorsService.loadColors();
    effect(() => {
      const id = this.id();
      if (id !== undefined) {
        this.loadItem(id);
      }
    });
  }

  /** Edit mode: fills the form (and photo) with the stored item. */
  private async loadItem(id: string): Promise<void> {
    const run = ++this.loadRun;
    this.loadState.set('loading');
    try {
      const item = await this.wardrobeService.getById(id);
      if (run !== this.loadRun) return;
      this.form.setValue({ name: item.name, type: item.type, colors: [...item.colors] });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.image.set(item.image ?? null);
      this.loadState.set('ready');
    } catch (error) {
      if (run !== this.loadRun) return;
      this.loadState.set(error instanceof WardrobeItemNotFoundError ? 'not-found' : 'error');
    }
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

  /** Adds a color (e.g. one picked from the photo) if it isn't selected yet. */
  protected addColor(color: Color): void {
    if (!this.form.controls.colors.value.includes(color.hex)) {
      this.toggleColor(color);
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, type, colors } = this.form.getRawValue();
    const image = this.image();
    const item = {
      name: name.trim(),
      type: type as WardrobeItemType,
      colors,
      ...(image ? { image } : {}), // no photo (or a removed one) → no `image` field
    };
    const id = this.id();
    this.saving.set(true);
    this.error.set(null);
    try {
      if (id === undefined) {
        await this.wardrobeService.create(item);
      } else {
        await this.wardrobeService.update(id, item);
      }
      await this.router.navigateByUrl(this.returnUrl());
    } catch (error) {
      this.error.set(
        error instanceof WardrobeStorageFullError ? error.message : 'Could not save the item.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
