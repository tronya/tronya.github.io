import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MonoBankApi } from '../../../../api/monobank';

@Component({
  selector: 'money-counter',
  templateUrl: './money-counter.component.html',
  styleUrl: './money-counter.component.scss',
  imports: [CommonModule],
})
export class MoneyCounterComponent {
  jatReq$ = this.monoBankApi.currentJarValue;

  subscription = this.monoBankApi.getJarNUmber();

  constructor(private monoBankApi: MonoBankApi) {
    this.subscription.subscribe();
  }
}
