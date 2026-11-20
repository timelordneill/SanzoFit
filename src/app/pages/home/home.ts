import { Component, inject, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, toRgbString } from '../../models/color';
import { ColorsService } from '../../services/colors.service';

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  colorsservice = inject(ColorsService);
  colors: Signal<Color[]> = this.colorsservice.colors;

  constructor() {
    this.colorsservice.loadColors();
  }

  rgb(color: Color): string {
    return toRgbString(color);
  }
}
