import { Component, Input, OnInit } from '@angular/core';
import { Constants } from '../../models';

interface Cell {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
    selector: '[grid-layer]',
    templateUrl: 'grid.component.html',
    imports: []
})
export class GridLayerComponent implements OnInit{
  @Input() public cols = 200;
  @Input() public rows = 5;

  public cells: Cell[] = [];

  drawGrif() {
    if(!this.cols || !this.rows) return;

    console.log(this.cols, this.rows)
    const height = Constants.ROW_HEIGHT;
    const width = Constants.COLUMN_WIDTH;


    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.cols; column++) {
        this.cells.push({
          x: Constants.OFFSET + column * width,
          y: Constants.OFFSET + row * height,
          width,
          height,
        });
      }
    }
  }
  ngOnInit(): void {
    this.drawGrif()
  }
}
