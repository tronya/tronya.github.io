import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
// import * as d3 from 'd3';

@Component({
  selector: 'character-d3',
  templateUrl: './character.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class CharacterComponent implements OnInit {
  @Input() matrix: number[][] = [];

  cellWidth: number = 15;
  cellHeight: number = 15;
  gap: number = 10;
  rows: number = 0;
  cols: number = 0;
  svgWidth: number = 300;
  svgHeight: number = 300;
  flattenedMatrix: {
    cx: number;
    cy: number;
    r: number;
    value: number;
    color: string;
  }[] = [];

  ngOnInit(): void {
    this.rows = this.matrix.length;
    this.cols = this.matrix[0].length;

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const cx = j * (this.cellWidth + this.gap) + this.cellWidth / 2;
        const cy = i * (this.cellHeight + this.gap) + this.cellHeight / 2;
        const value = this.matrix[i][j];
        const color = value ? 'white' : 'black';
        this.flattenedMatrix.push({
          cx,
          cy,
          r: this.cellWidth / 2,
          value,
          color,
        });
      }
    }

    this.svgWidth = this.cols * this.cellWidth + (this.cols - 1) * this.gap;
    this.svgHeight = this.rows * this.cellHeight + (this.rows - 1) * this.gap;
  }
}
