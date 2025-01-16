import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { IResponse } from '../app/components/dots-text/particles/particles.helper';
import {
  MONOBANK_HOST,
  MONOBANK_JAR,
  MONOBANK_JAR_ROUTE,
} from './mono-rest-ep';
import { LinkGeneratorFactory } from './monobank-link-generator';

@Injectable({
  providedIn: 'root', // Makes the service a singleton, shared across the app
})
export class MonoBankApi {
  private http = inject(HttpClient);
  private timerTime = timer(0, 1 * 30 * 1000);

  public currentJarValue = new BehaviorSubject<{
    amount: string;
    description: string;
  }>({
    amount: '',
    description: '',
  });

  private jarFactory = new LinkGeneratorFactory({
    host: MONOBANK_HOST,
    route: MONOBANK_JAR_ROUTE,
    jar: MONOBANK_JAR,
  });

  private jarLink = this.jarFactory.getJarLink();
  private currencyLink = this.jarFactory.getCurrency();

  private responce = this.timerTime.pipe(
    shareReplay(1),
    switchMap(() => this.http.get<IResponse>(this.jarLink)),
    distinctUntilChanged()
  );

  getJarNUmber() {
    return this.responce.pipe(
      map((res) => ({
        amount:
          res.amount.toString().slice(0, -2) +
          '.' +
          res.amount.toString().slice(-2),
        description: res.description,
      })),
      tap((res) => this.currentJarValue.next(res))
    );
  }
}
