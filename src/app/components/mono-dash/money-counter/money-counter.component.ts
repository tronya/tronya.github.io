import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MonoBankApi } from '../../../../api/monobank';
import { colors } from '../helper';

@Component({
  selector: 'money-counter',
  templateUrl: './money-counter.component.html',
  styleUrl: './money-counter.component.scss',
  standalone: true,
  providers: [MonoBankApi],
  imports: [CommonModule],
})
export class MoneyCounterComponent {
  httpJAR = inject(MonoBankApi);
  jatReq$ = this.httpJAR.getJarNUmber();
}
