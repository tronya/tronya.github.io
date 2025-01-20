import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, forkJoin } from 'rxjs';
import { switchMap, shareReplay, startWith, map } from 'rxjs/operators';
import {
  MONOBANK_HOST,
  MONOBANK_JAR_ROUTE,
  MONOBANK_JAR,
} from './mono-rest-ep';
import { LinkGeneratorFactory } from './monobank-link-generator';
import { DTOCurrency, DTOJar } from './monobank.model';

@Injectable({
  providedIn: 'root', // Сервіс буде синглтоном в додатку
})
export class MonoBankApi {
  private jarFactory = new LinkGeneratorFactory({
    host: MONOBANK_HOST,
    route: MONOBANK_JAR_ROUTE,
    jar: MONOBANK_JAR,
  });

  private readonly jarLink = this.jarFactory.getJarLink();
  private readonly currencyLink = this.jarFactory.getCurrency();
  private readonly updateInterval = 60000; // Оновлення раз в хвилину (60000 мс)

  private readonly jarDataSubject = new BehaviorSubject<DTOJar | null>(null);
  private readonly currencyDataSubject = new BehaviorSubject<DTOCurrency | null>(null);

  jarData$ = this.jarDataSubject.asObservable(); // Для підписки на дані банку
  currencyData$ = this.currencyDataSubject.asObservable(); // Для підписки на дані валюти

  constructor(private http: HttpClient) {
    this.initializeDataFetching();
  }

  private initializeDataFetching() {
    interval(this.updateInterval)
      .pipe(
        startWith(0), // Одразу виконує перший запит
        switchMap(() =>
          forkJoin({
            jar: this.http.get<DTOJar>(this.jarLink),
            currency: this.http.get<DTOCurrency>(this.currencyLink),
          })
        ),
        shareReplay(1) // Кешує останнє значення
      )
      .subscribe({
        next: ({ jar, currency }) => {
          this.jarDataSubject.next(jar);
          this.currencyDataSubject.next(currency);
        },
        error: (err) => {
          console.error('Failed to fetch data:', err);
        },
      });
  }

  // Метод для отримання форматованих даних банку
  getFormattedJarData() {
    return this.jarData$.pipe(
      map((jar) => {
        if (!jar) {
          return { amount: '', description: '' };
        }
        return {
          amount: (jar.amount / 100).toFixed(2),
          description: jar.description,
        };
      })
    );
  }
}
