import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { timer, switchMap, map, distinctUntilChanged } from 'rxjs';
import { IResponse } from '../app/components/dots-text/particles/particles.helper';
import { LinkGeneratorFactory } from './monobank-link-generator';
import {
  MONOBANK_HOST,
  MONOBANK_JAR_ROUTE,
  MONOBANK_JAR,
} from './mono-rest-ep';
export class MonoBankApi {
  private http = inject(HttpClient);
  private timerTime = timer(0, 1 * 30 * 1000);

  private jarFactory = new LinkGeneratorFactory({
    host: MONOBANK_HOST,
    route: MONOBANK_JAR_ROUTE,
    jar: MONOBANK_JAR,
  });

  private jarLink = this.jarFactory.getJarLink();
  private currencyLink = this.jarFactory.getCurrency();

  private responce = this.timerTime.pipe(
    switchMap(() => this.http.get<IResponse>(this.jarLink)),
    distinctUntilChanged()
  );

  getJarNUmber() {
    this.http.get(this.currencyLink).subscribe((res) => console.log(res));

    return this.responce.pipe(
      map((res) => ({
        amount:
          res.amount.toString().slice(0, -2) +
          '.' +
          res.amount.toString().slice(-2),
        description: res.description,
      }))
    );
  }
}
