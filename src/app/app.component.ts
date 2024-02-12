import { Component, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { interval, map, switchMap, timer } from 'rxjs';
import { RxLet } from '@rx-angular/template/let';
import { CommonModule } from '@angular/common';
import { environment } from '../environments/environment';

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
  imports: [CommonModule, HttpClientModule, RxLet],
  host: { class: 'h-full w-full' },
})
export class AppComponent {
  title = 'mono-banka';
  http = inject(HttpClient);
  JAR_KEY = environment.JAR_KEY;
  link = `https://api.monobank.ua/bank/jar/HfSCkWGoDun87SYGstsK9q594bTVYp`;

  req$ = timer(0, 1 * 60 * 1000).pipe(
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
    )
  );

  constructor() {
    interval(60 * 60 * 1000).pipe(
      map(() => {
        console.log('reloading');
        window.location.reload();
      })
    ).subscribe();
  }
}
