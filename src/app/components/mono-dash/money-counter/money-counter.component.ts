import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MonoBankApi } from '../../../../api/monobank';
import { CurrencyWithSpacePipe } from '../graph/currency.pipe';

@Component({
  selector: 'money-counter',
  templateUrl: './money-counter.component.html',
  styleUrl: './money-counter.component.scss',
  imports: [CommonModule],
  providers: [CurrencyPipe],
})
export class MoneyCounterComponent {
  jatReq$ = this.monoBankApi.getFormattedJarData();
  constructor(private monoBankApi: MonoBankApi) {
  }
}
