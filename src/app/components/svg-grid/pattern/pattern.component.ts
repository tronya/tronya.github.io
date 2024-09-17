import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  Input,
  signal,
  ViewChild,
} from '@angular/core';
import { each, values } from 'lodash';
import {
  SignalStatesPossiblePatterns,
  SignalStatePolychromePatternEnum,
  SignalStatePatternsExtraEnum,
  Constants,
  STATES_SYMBOL,
  SignalStatePatternsColors,
  FLASHING_SIGNALS,
  MULTIPLE_COLORS_SIGNALS,
  twoSignalsLayer,
  threeSignalLayer,
  CUSTOM_SIGNALS_WITH_LINE,
  CUSTOM_SIGNALS_STYLES,
  BASIC_SIGNALS,
  SignalStateToPatternEnum,
  BLACK_AND_WHITE_PATTERNS,
  BlackAndWhitePatternsEnum,
} from '../models';
import { PatternDrawer } from './pattern-drawer.helper';

@Component({
  standalone: true,
  selector: 'pattern',
  templateUrl: './pattern.component.html',
  imports: [CommonModule],
})
export class PatternComponent implements AfterViewInit {
  @ViewChild('dynamicSvg', { static: false }) public svgElement!: ElementRef;

  public patternName = signal<SignalStatesPossiblePatterns>(
    SignalStatePolychromePatternEnum.UNKNOWN
  );
  @Input() public set pattern(patternName: SignalStatesPossiblePatterns) {
    this.patternName.set(patternName);
  }
  public ngAfterViewInit(): void {
    this.createGrid();
    this.drawPattern({ start: 0, end: 10 });
  }

  public createGrid(): void {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = this.svgElement.nativeElement;
    const height = Constants.ROW_HEIGHT;
    const width = Constants.COLUMN_WIDTH;

    for (let i = 0; i < 10; i++) {
      const rectElement = document.createElementNS(svgNS, 'rect');

      // Set the width, height, and position for each cell
      rectElement.setAttribute('width', width.toString());
      rectElement.setAttribute('height', height.toString());
      rectElement.setAttribute('x', (Constants.OFFSET + i * width).toString()); // Offset each by 9px, starting at 5px
      rectElement.setAttribute('y', Constants.OFFSET.toString()); // 5px offset from the top
      rectElement.setAttribute('stroke', 'grey'); // Border color
      rectElement.setAttribute('stroke-width', '1'); // Border thickness
      rectElement.setAttribute('fill', 'none'); // No fill for cells

      // Append the rectangle to the SVG
      svg.appendChild(rectElement);
    }
  }

  private drawPattern({ start = 0, end = 10 }): void {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = this.svgElement.nativeElement;
    const pattern = this.patternName();

    const {
      mainLinePath = '',
      strokePath = '',
      arrowPath = '',
      extraPath = ' ',
      rect = undefined,
    } = new PatternDrawer({ start, end }, pattern, svg).getPattern();

    // depends what pattern object would have,
    // we would draw some layers
    // main line drawing
    const rectElement = document.createElementNS(svgNS, 'path');
    rectElement.setAttribute('d', mainLinePath);
    each(SignalStatePatternsColors[pattern]?.mainLine, (value, key) => {
      rectElement.setAttribute(key, value);
    });
    svg.appendChild(rectElement);

    // arraow line drawing
    if (arrowPath) {
      const rectElement = document.createElementNS(svgNS, 'path');
      rectElement.setAttribute('d', arrowPath);
      each(SignalStatePatternsColors[pattern]?.arrow, (value, key) => {
        rectElement.setAttribute(key, value);
      });
      svg.appendChild(rectElement);
    }
    // stroke line drawing
    if (strokePath) {
      const rectElement = document.createElementNS(svgNS, 'path');
      rectElement.setAttribute('d', strokePath);
      each(SignalStatePatternsColors[pattern]?.stroke, (value, key) => {
        rectElement.setAttribute(key, value);
      });
      svg.appendChild(rectElement);
    }
    //// extra line drawing
    if (extraPath) {
      const rectElement = document.createElementNS(svgNS, 'path');
      rectElement.setAttribute('d', extraPath);
      each(SignalStatePatternsColors[pattern]?.extra, (value, key) => {
        rectElement.setAttribute(key, value);
      });
      svg.appendChild(rectElement);
    }
    // rect line drawing
    if (rect) {
      const rectElement = document.createElementNS(svgNS, 'rect');
      rectElement.setAttribute('width', rect.w.toString());
      rectElement.setAttribute('height', rect.h.toString());
      rectElement.setAttribute('x', rect.x.toString());
      rectElement.setAttribute('y', rect.y.toString());
      each(SignalStatePatternsColors[pattern]?.rect, (value, key) => {
        rectElement.setAttribute(key, value);
      });
      svg.appendChild(rectElement);
    }
  }
}
