import { CommonModule } from '@angular/common';
import { } from '@angular/common/http';
import { Component } from '@angular/core';
import { Movies } from '../movies/movies.component';

@Component({
  selector: 'playground',
  templateUrl: './playground.component.html',
  imports: [CommonModule, Movies],
})
export class PlaygroundComponent {}
