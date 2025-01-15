import { Component, OnInit } from '@angular/core';
import { QRCodeComponent } from './qr-code/qr-code.component';
import { MoneyCounterComponent } from './money-counter/money-counter.component';
import { colors } from './helper';
import { CommonModule } from '@angular/common';
import { map, timer } from 'rxjs';
import { BgChangerComponent } from '../bg-changer/bg-changer.component';
import { DroneAnimationComponent } from './drone-animation/drone-animation.component';

@Component({
    selector: 'mono-dash',
    templateUrl: './mono-dash.component.html',
    imports: [MoneyCounterComponent, CommonModule, BgChangerComponent]
})
export class MonoDash implements OnInit {
  timerDelay = 60 * 60 * 1000;
  ngOnInit(): void {
    setTimeout(() => {
      window.location.reload();
    }, this.timerDelay);
  }

  time$ = timer(0, 1000).pipe(map(() => new Date().toUTCString()));

  randomColor = colors[Math.floor(Math.random() * colors.length)];
}
