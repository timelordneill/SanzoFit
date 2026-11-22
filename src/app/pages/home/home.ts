import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ColorTile } from '../../components/color-tile/color-tile';
import { ColorsService } from '../../services/colors.service';

@Component({
  imports: [RouterLink, ColorTile],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private readonly colorsService = inject(ColorsService);

  protected readonly colors = this.colorsService.colors;

  constructor() {
    this.colorsService.loadColors();
  }
}
