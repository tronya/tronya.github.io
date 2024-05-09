import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { timer, switchMap, map, distinctUntilChanged } from 'rxjs';
import { IResponse } from '../app/components/dots-text/particles/particles.helper';
import { environment } from '../environments/environment';
import { routes } from '../app/app.routes';

const JAR_KEY = environment.JAR_KEY;
const host = 'https://api.monobank.ua';
const jar = 'HfSCkWGoDun87SYGstsK9q594bTVYp';
const jarRoute = '/bank/jar/';

export class LinkGeneratorFactory {
  private _host: string;
  private _route: string;
  private _jar: string;
  constructor({ host, route }: { host: string; route: string }) {
    this._host = host;
    this._route = route;
    this._jar = jar;
  }
  getLink() {
    return `${this._host}${this._route}${this._jar}`;
  }
}

export class MonoBankApi {
  private http = inject(HttpClient);
  private timerTime = timer(0, 1 * 30 * 1000);

  private jarLink = new LinkGeneratorFactory({
    host,
    route: jarRoute,
  }).getLink();

  private responce = this.timerTime.pipe(
    switchMap(() => this.http.get<IResponse>(this.jarLink)),
    distinctUntilChanged()
  );
  getJarNUmber() {
    return this.responce.pipe(
      map((res) => +res.amount.toString().slice(0, -2))
    );
  }
}
