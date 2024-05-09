import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MonoBankApi } from '../../../../api/monobank';

@Component({
  selector: 'money-counter',
  templateUrl: './money-counter.component.html',
  standalone: true,
  providers: [MonoBankApi],
  imports: [CommonModule],
})
export class MoneyCounterComponent {
  httpJAR = inject(MonoBankApi);

  jatReq$ = this.httpJAR.getJarNUmber();
}
