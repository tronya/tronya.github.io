import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RxLet } from '@rx-angular/template/let';
import {
  concatMap,
  exhaustMap,
  interval,
  map,
  of,
  pairwise,
  switchMap,
} from 'rxjs';

@Component({
  selector: 'playground',
  templateUrl: './playground.component.html',
  standalone: true,
  imports: [RxLet, CommonModule],
})
export class PlaygroundComponent {
  constructor() {}
  tick$ = interval(2000);
}
