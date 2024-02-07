import { Component, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { interval, map, switchMap } from 'rxjs';
import { RxLet } from '@rx-angular/template/let';
import { CommonModule } from '@angular/common';

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
})
export class AppComponent {
  title = 'mono-banka';
  http = inject(HttpClient);

  req$ = interval(10000).pipe(
    switchMap(() =>
      this.http
        .get<IResponse>(
          'https://api.monobank.ua/bank/jar/'
        )
        .pipe(
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
}
