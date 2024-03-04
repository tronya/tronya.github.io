import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  concatMap,
  delay,
  distinctUntilChanged,
  interval,
  map,
  of,
  switchMap,
  timer,
} from 'rxjs';
import { RxLet } from '@rx-angular/template/let';
import { CommonModule } from '@angular/common';
import { environment } from '../environments/environment';
import { CharacterComponent } from './character/character.component';
import { DigitsComponent } from './digits/digits.component';
import { PlaneComponent } from './plane.component';
import { ParticlesComponent } from './particles/particles.component';

interface IResponse {
  amount: number;
  goal: number;
  ownerIcon: string;
  title: string;
  ownerName: string;
  currency: number;
  description: string;
  jarId: string;
  blago: boolean;
  closed: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RxLet,
    CharacterComponent,
    DigitsComponent,
    PlaneComponent,
    ParticlesComponent,
  ],
  host: { class: 'h-full w-full bg-black' },
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
  title = 'mono-banka';
  http = inject(HttpClient);
  JAR_KEY = environment.JAR_KEY;
  link = `https://api.monobank.ua/bank/jar/HfSCkWGoDun87SYGstsK9q594bTVYp`;

  // req$ = of(1, 5, 2, 2, 3, 4, 4, 4, 5, 5).pipe(
  //   concatMap((number) => of(number).pipe(delay(2000))),
  //   distinctUntilChanged(),
  //   map((value) => {
  //     console.log(value);
  //     return { amount: `magic` };
  //   })
  // );

  req$ = timer(0, 1 * 30 * 1000).pipe(
    switchMap(() =>
      this.http.get<IResponse>(this.link).pipe(
        map((res) => {
          console.log(res);

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
