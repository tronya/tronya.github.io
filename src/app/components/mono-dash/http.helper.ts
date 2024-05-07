import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  distinctUntilChanged,
  map,
  switchMap,
  timer
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { IResponse } from '../dots-text/particles/particles.helper';

export class HttpMonoServer {
  http = inject(HttpClient);
  JAR_KEY = environment.JAR_KEY;
  link = `https://api.monobank.ua/bank/jar/HfSCkWGoDun87SYGstsK9q594bTVYp`;

  responce$ = timer(0, 1 * 30 * 1000).pipe(
    switchMap(() =>
      this.http
        .get<IResponse>(this.link)
        .pipe(map((res) => +res.amount.toString().slice(0, -2)))
    ),
    distinctUntilChanged()
  );
}
