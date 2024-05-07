import { Component, inject } from '@angular/core';
import { HttpMonoServer } from '../http.helper';
import { CommonModule } from '@angular/common';
import { map, pairwise, scan } from 'rxjs';

@Component({
  selector: 'money-counter',
  templateUrl: './money-counter.component.html',
  standalone: true,
  providers: [HttpMonoServer],
  imports: [CommonModule],
})
export class MoneyCounterComponent {
  httpJAR = inject(HttpMonoServer);

  jatReq$ = this.httpJAR.responce$;
}
