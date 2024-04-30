import { Component } from '@angular/core';
import { QRCodeComponent } from './qr-code/qr-code.component';
import { MoneyCounterComponent } from './money-counter/money-counter.component';

@Component({
  selector: 'mono-dash',
  templateUrl: './mono-dash.component.html',
  standalone: true,
  imports: [QRCodeComponent, MoneyCounterComponent],
})
export class MonoDash {}
