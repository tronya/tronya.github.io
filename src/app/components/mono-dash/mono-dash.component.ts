import { Component, OnInit } from '@angular/core';
import { QRCodeComponent } from './qr-code/qr-code.component';
import { MoneyCounterComponent } from './money-counter/money-counter.component';
import { colors } from './helper';
import { CommonModule } from '@angular/common';
import { map, timer } from 'rxjs';

@Component({
  selector: 'mono-dash',
  templateUrl: './mono-dash.component.html',
  standalone: true,
  imports: [QRCodeComponent, MoneyCounterComponent, CommonModule],
})
export class MonoDash implements OnInit {
  timerDelay = 60 * 60 * 1000;
  ngOnInit(): void {
    setTimeout(() => {
      window.location.reload();
    }, this.timerDelay);
  }

  time$ = timer(0, 1000).pipe(map(() => new Date()));

  randomColor = colors[Math.floor(Math.random() * colors.length)];
}
