import { Component, OnInit } from '@angular/core';
import { QRCodeComponent } from './qr-code/qr-code.component';
import { MoneyCounterComponent } from './money-counter/money-counter.component';
import { colors } from './helper';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mono-dash',
  templateUrl: './mono-dash.component.html',
  standalone: true,
  imports: [QRCodeComponent, MoneyCounterComponent, CommonModule],
})
export class MonoDash implements OnInit {
  timer = 60 * 60 * 1000;
  ngOnInit(): void {
    setTimeout(() => {
      window.location.reload();
    }, this.timer);
  }
  randomColor = colors[Math.floor(Math.random() * colors.length)];
}
