import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MonoBankApi } from '../../../../api/monobank';
import { CurrencyWithSpacePipe } from '../graph/currency.pipe';
import { combineLatest, interval, map } from 'rxjs';

@Component({
  selector: 'money-counter',
  templateUrl: './money-counter.component.html',
  styleUrl: './money-counter.component.scss',
  imports: [CommonModule],
  providers: [CurrencyPipe],
})
export class MoneyCounterComponent {
  jatReq$ = this.monoBankApi.getFormattedJarData();

  a$ = interval(2000).pipe(map(() => this.random(-10, 10)));
  b$ = interval(2000).pipe(map(() => this.random(-10, 10)));
  c$ = interval(2000).pipe(map(() => this.random(-10, 10)));

  filter$ = combineLatest({ a: this.a$, b: this.b$, c: this.c$ }).pipe(
    map(({ a, b, c }) => `drop-shadow(${a}rem ${b}rem ${c}rem green)`)
  );

  public random(min: number, max: number) {
    return Math.floor(min + Math.random() * (max - min));
  }
  constructor(private monoBankApi: MonoBankApi) {}
}
