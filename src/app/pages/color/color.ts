import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ColorDetail } from '../../components/color-detail/color-detail';
import { Color } from '../../models/color';
import { ColorsService } from '../../services/colors.service';

@Component({
  imports: [RouterLink, ColorDetail],
  selector: 'app-color',
  styleUrl: './color.scss',
  templateUrl: './color.html',
})
export class ColorPage {
  private readonly colorsService = inject(ColorsService);

  /** Route parameter `:id`: the color's position in the colors list. */
  readonly id = input.required<string>();

  protected readonly loaded = computed(() => this.colorsService.colors().length > 0);

  protected readonly color = computed<Color | undefined>(
    () => this.colorsService.colors()[Number(this.id())],
  );

  constructor() {
    this.colorsService.loadColors();
  }
}
