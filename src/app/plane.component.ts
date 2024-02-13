import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'plane',
  template: '<svg #svg></svg>',
  standalone: true,
})
export class PlaneComponent implements OnInit {
  @ViewChild('svg') svg?: ElementRef<HTMLDivElement>;
//   container;
  ngOnInit() {
    setTimeout(() => {
      if (!this.svg) return;
      console.log(this.svg);
      const svg = d3.select(this.svg.nativeElement);
      console.log(svg);
      svg.attr('viewBox', `0 0 600 600`)
      .attr('width', 600)
      .attr('height', 600);

      svg
        .append('circle')
        .attr('cx', 4)
        .attr('cy', 4)
        .attr('r', 4)
        .attr('fill', 'black');




        // requestAnimationFrame()

    }, 1000);
  }
}
