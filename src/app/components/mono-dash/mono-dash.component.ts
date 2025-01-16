import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { map, timer } from 'rxjs';
import { colors } from './helper';
import { MoneyCounterComponent } from './money-counter/money-counter.component';
import { GraphComponent } from './graph/graph.component';

@Component({
  selector: 'mono-dash',
  templateUrl: './mono-dash.component.html',
  standalone: true,
  imports: [MoneyCounterComponent, CommonModule, GraphComponent],
})
export class MonoDash implements OnInit {
  timerDelay = 60 * 60 * 1000;
  ngOnInit(): void {
    setTimeout(() => {
      window.location.reload();
    }, this.timerDelay);
  }
  // 271.37

  time$ = timer(0, 1000).pipe(map(() => new Date().toUTCString()));

  randomColor = colors[Math.floor(Math.random() * colors.length)];
}
