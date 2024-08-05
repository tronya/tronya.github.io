import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { interval, map } from 'rxjs';

@Component({
  selector: 'drone-animation',
  templateUrl: './drone-animation.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class DroneAnimationComponent implements OnInit {
  wh = window.innerHeight;
  ww = window.innerWidth;

  view$ = interval(5000).pipe(
    map((res) => {
      return {
        x: this.getRandomArbitrary(0, this.wh),
        y: this.getRandomArbitrary(0, this.ww),
        r: this.getRandomArbitrary(0, 90),
      };
    })
  );

  getRandomArbitrary(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  ngOnInit(): void {
    const wh = window.innerHeight;
    const ww = window.innerWidth;
    console.log(wh, ww);
  }
}
