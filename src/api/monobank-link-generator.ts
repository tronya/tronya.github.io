import { MONOBANK_CURRENCY } from "./mono-rest-ep";

export class LinkGeneratorFactory {
  private _host: string;
  private _route: string;
  private _jar: string;
  constructor({
    host,
    route,
    jar,
  }: {
    host: string;
    route: string;
    jar: string;
  }) {
    this._host = host;
    this._route = route;
    this._jar = jar;
  }
  getJarLink() {
    return `${this._host}/${this._route}/${this._jar}`;
  }

  getCurrency() {
    return `${this._host}/${MONOBANK_CURRENCY}`;
  }
}
