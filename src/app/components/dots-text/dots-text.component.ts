import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RxLet } from '@rx-angular/template/let';
import { CanvaComponent } from '../ui/canva/canva.component';
import { CharacterComponent } from '../ui/character/character.component';
import { DigitsComponent } from '../ui/digits/digits.component';
import { ParticlesComponent } from './particles/particles.component';
import {
  of,
  concatMap,
  delay,
  distinctUntilChanged,
  map,
  interval,
  timer,
  switchMap,
  startWith,
  from,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { IResponse } from './particles/particles.helper';

@Component({
  selector: 'dots-text',
  template:
    '<ng-container *rxLet="req$; let n"><particles [amount]="n.amount"></particles></ng-container>',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RxLet,
    CharacterComponent,
    DigitsComponent,
    ParticlesComponent,
    CanvaComponent,
  ],
})
export class DotsTextComponent {
  http = inject(HttpClient);
  JAR_KEY = environment.JAR_KEY;
  link = `https://api.monobank.ua/bank/jar/HfSCkWGoDun87SYGstsK9q594bTVYp`;

    // req$ = of(1, 5, 2, 2, 3, 4, 4, 4, 5, 5).pipe(
    //   concatMap((number) => of(number).pipe(delay(60000))),
    //   distinctUntilChanged(),
    //   startWith(33333),
    //   map((value) => {
    //     console.log(value);
    //     return { amount: `${36456 + value}` };
    //   })
    // );

  req$ = timer(0, 1 * 30 * 1000).pipe(
    switchMap(() =>
      this.http.get<IResponse>(this.link).pipe(
        map((res) => {
          return {
            ...res,
            amount: res.amount.toString().slice(0, -2),
            goal: res.goal.toString().slice(0, -2),
          };
        })
      )
    ),
    distinctUntilChanged()
  );
  
  constructor() {
    interval(60 * 60 * 1000)
      .pipe(
        map(() => {
          console.log('reloading');
          window.location.reload();
        })
      )
      .subscribe();
  }
}
