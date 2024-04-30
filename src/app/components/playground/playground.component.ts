import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RxLet } from '@rx-angular/template/let';
import { Movies } from '../movies/movies.component';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'playground',
  templateUrl: './playground.component.html',
  standalone: true,
  imports: [RxLet, CommonModule, Movies],
})
export class PlaygroundComponent {}
