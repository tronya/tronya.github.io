import {
  timer,
  switchMap,
  map,
  distinctUntilChanged,
  scan,
  startWith,
  of,
  concatMap,
  delay,
} from 'rxjs';
import { IResponse } from '../dots-text/particles/particles.helper';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export class HttpMonoServer {
  http = inject(HttpClient);
  JAR_KEY = environment.JAR_KEY;
  link = `https://api.monobank.ua/bank/jar/HfSCkWGoDun87SYGstsK9q594bTVYp`;

  // req$ = timer(0, 1 * 30 * 1000).pipe(
  //   switchMap(() =>
  //     this.http
  //       .get<IResponse>(this.link)
  //       .pipe(map((res) => +res.amount.toString().slice(0, -2)))
  //   ),
  responce$ = of(
    33333,
    33333,
    33333,
    33333,
    33370,
    52300,
    12200,
    23000,
    22,
    12954,
    34000,
    5,
    5
  ).pipe(
    concatMap((number) => of(number).pipe(delay(2000))),
    distinctUntilChanged(),
  );
}