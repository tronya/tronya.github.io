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
    let path: string = '',
      mainLinePath: string = '',
      strokePath: string = '',
      arrowPath: string = '',
      extraPath: string = '',
      rect: { x: number; y: number; w: number; h: number } | undefined =
        undefined;

    const x1: number = Constants.OFFSET + start,
      x2: number = Constants.OFFSET + end * Constants.COLUMN_WIDTH;
    let y1: number = Constants.OFFSET + 0.5 * Constants.ROW_HEIGHT,
      y2 = Constants.OFFSET + 0.5 * Constants.ROW_HEIGHT;

    path = new PatternDrawer({ start, end }, pattern).getBasePath();

    if (BLACK_AND_WHITE_PATTERNS.has(pattern)) {
      const width = Constants.ROW_HEIGHT / 2;

      switch (pattern) {
        case BlackAndWhitePatternsEnum.AMBER_BW:
          // Diagonal line
          const AMBM = `M ${x1} ${y1 + width}`;
          const AMBL1 = `L ${x2} ${y2}`;
          path += `${AMBM} ${AMBL1}`;
          break;
        case BlackAndWhitePatternsEnum.RED_AMBER_FLASH_BW:
          const M = `M ${x1} ${y1}`;
          const L1 = `L ${x2} ${y2}`;
          const L2 = `L ${x2} ${y1 + width}`;
          const L3 = `L ${x1} ${y1 + width}`;
          const L4 = `L ${x1} ${y1}`;
          path += `${M} ${L1} ${L2} ${L3} ${L4} `;

          // middle line bolder
          path += `${'M ' + x1 + ' ' + (y1 + width / 2)} ${
            'L ' + x2 + ' ' + (y2 + width / 2)
          }`;
          path += `${'M ' + x1 + ' ' + (y1 - 1 + width / 2)} ${
            'L ' + x2 + ' ' + (y2 - 1 + width / 2)
          }`;
          path += `${'M ' + x1 + ' ' + (y1 + 1 + width / 2)} ${
            'L ' + x2 + ' ' + (y2 + 1 + width / 2)
          }`;
          // Diagonal line
          path += `M ${x1 + ' ' + (y1 + width)} L ${x2 + ' ' + y2}`;
          break;
        case BlackAndWhitePatternsEnum.GREEN_FLASH_BW:
          let GRFLS = x1 + 4;
          while (GRFLS < x2) {
            path += `${'M ' + GRFLS + ' ' + y1} ${
              'L ' + GRFLS + ' ' + (y2 + width)
            }`;
            GRFLS += 4;
          }
          break;

        case BlackAndWhitePatternsEnum.AMBER_FLASH_BW:
          let leg = 1;
          path = ` ${'M ' + x2 + ' ' + y1} ${'L ' + x2 + ' ' + (y1 + width)} ${
            'M ' + x1 + ' ' + y1
          } ${'L ' + x1 + ' ' + (y1 + width)} `;
          let x11 = x1 + 9;
          while (x11 < x2) {
            if (leg % 2 == 0) {
              path += `${'L ' + x11 + ' ' + (y1 + width)}`;
            } else {
              path += `${'L ' + x11 + ' ' + y1}`;
            }
            x11 += 9;
            leg++;
          }
          if (leg % 2 == 0) {
            path += `${'L ' + x11 + ' ' + (y1 + width)}`;
          } else {
            path += `${'L ' + x11 + ' ' + y1}`;
          }

          path += ``;
          break;

        case BlackAndWhitePatternsEnum.PAST_AND_GREEN_BW:
          const arrowSize = 4;
          arrowPath += `M ${x1} ${y2 - arrowSize}  L ${x1} ${
            y2 + arrowSize
          } L ${x1 + arrowSize + 2} ${y2} Z`;
          break;

        case BlackAndWhitePatternsEnum.MIN_GREEN_BW:
          mainLinePath += `M ${x1} ${y1 + 7}  L ${x2} ${y2 + 7} `;
          break;
      }
      mainLinePath += path;
    }

    if (CUSTOM_SIGNALS_STYLES.has(pattern)) {
      switch (pattern) {
        case SignalStatePatternsExtraEnum.SOME_COOL_PATTERN:
          strokePath += `M ${x1} ${y1 - 10} L${x1} ${y1 + 10}   `;
          for (let s = start; s < end; s++) {
            let xa = Constants.OFFSET + s * Constants.COLUMN_WIDTH;
            let xb =
              Constants.OFFSET +
              Constants.COLUMN_WIDTH +
              s * Constants.COLUMN_WIDTH;

            let from = Constants.OFFSET + Constants.ROW_HEIGHT * 0.25;
            let to = Constants.OFFSET + Constants.ROW_HEIGHT * 0.75;
            const dirr =
              s % 2
                ? `M ${xa} ${from} L${xb} ${to}`
                : `M ${xa} ${to} L${xb} ${from}`;
            strokePath += path;
            extraPath += dirr;
          }
          extraPath += `M ${end * Constants.COLUMN_WIDTH + Constants.OFFSET} ${
            y1 - 10
          } L${end * Constants.COLUMN_WIDTH + Constants.OFFSET} ${y1 + 10}   `;
          break;
        case SignalStatePatternsExtraEnum.SOME_2_COOL_PATTERN:
          extraPath += `M ${x1} ${y1 - 10} L${x1} ${y1 + 10}   `;
          for (let s = start; s < end; s++) {
            let xa = Constants.OFFSET + s * Constants.COLUMN_WIDTH;
            let xb =
              Constants.OFFSET +
              Constants.COLUMN_WIDTH +
              s * Constants.COLUMN_WIDTH;

            let from = Constants.OFFSET + Constants.ROW_HEIGHT * 0.25;
            let to = Constants.OFFSET + Constants.ROW_HEIGHT * 0.75;
            const dirr =
              s % 2
                ? `M ${xa} ${from} L${xb} ${to}`
                : `M ${xa} ${to} L${xb} ${from}`;
            extraPath += dirr;
          }
          extraPath += `M ${end * Constants.COLUMN_WIDTH + Constants.OFFSET} ${
            y1 - 10
          } L${end * Constants.COLUMN_WIDTH + Constants.OFFSET} ${y1 + 10}   `;
          break;
        case SignalStatePatternsExtraEnum.SOME_3_COOL_PATTERN:
          rect = {
            x: start + Constants.OFFSET,
            y: Constants.OFFSET + Constants.ROW_HEIGHT * 0.25,
            w: (end - start) * Constants.COLUMN_WIDTH,
            h: Constants.ROW_HEIGHT / 2,
          };

          for (let s = start; s < end; s++) {
            let xa = Constants.OFFSET + s * Constants.COLUMN_WIDTH;
            let xb =
              Constants.OFFSET +
              Constants.COLUMN_WIDTH +
              s * Constants.COLUMN_WIDTH;

            let from = Constants.OFFSET + Constants.ROW_HEIGHT * 0.25;
            let to = Constants.OFFSET + Constants.ROW_HEIGHT * 0.75;
            const dirr =
              s % 2
                ? `M ${xa} ${from} L${xb} ${to}`
                : `M ${xa} ${to} L${xb} ${from}`;
            extraPath += dirr;
          }
          break;
        case SignalStatePatternsExtraEnum.AMBER_STRIKE_THROUGH_RED:
        case SignalStatePatternsExtraEnum.AMBER_STRIKE_THROUGH:
          extraPath += `M ${
            start * Constants.COLUMN_WIDTH + Constants.OFFSET
          } ${Constants.OFFSET + Constants.ROW_HEIGHT * 0.75} L${
            end * Constants.COLUMN_WIDTH + Constants.OFFSET
          } ${Constants.OFFSET + Constants.ROW_HEIGHT * 0.25}   `;
          mainLinePath += path;
          strokePath += path;
          break;
        case SignalStatePatternsExtraEnum.GREEN_EMPTY_GREEN:
          rect = {
            x: start + Constants.OFFSET,
            y: Constants.OFFSET + Constants.ROW_HEIGHT * 0.2,
            w: (end - start) * Constants.COLUMN_WIDTH,
            h: Constants.ROW_HEIGHT * 0.6,
          };

          for (let s = start; s < end; s++) {
            let tl = Constants.OFFSET + s * Constants.COLUMN_WIDTH;
            let tr =
              Constants.OFFSET +
              Constants.COLUMN_WIDTH +
              s * Constants.COLUMN_WIDTH;

            let bl = Constants.OFFSET + Constants.ROW_HEIGHT * 0.2;
            let br = Constants.OFFSET + Constants.ROW_HEIGHT * 0.8;
            const dirr =
              s % 2 ? `` : `M ${tl} ${bl} H ${tr} V ${br} H ${tl} Z `;
            mainLinePath += dirr;
          }
          break;
        case SignalStatePatternsExtraEnum.AMBER_CHESS_TYPE:
          for (let s = start; s < end; s++) {
            let tl = Constants.OFFSET + s * Constants.COLUMN_WIDTH;
            let tr =
              Constants.OFFSET +
              Constants.COLUMN_WIDTH +
              s * Constants.COLUMN_WIDTH;

            let ba = Constants.OFFSET + Constants.ROW_HEIGHT * 0.2;
            let bl = Constants.OFFSET + Constants.ROW_HEIGHT * 0.5;
            let br = Constants.OFFSET + Constants.ROW_HEIGHT * 0.8;
            const dirr =
              s % 2
                ? `M ${tl} ${ba} H ${tr} V ${bl} H ${tl} Z `
                : `M ${tl} ${bl} H ${tr} V ${br} H ${tl} Z `;
            mainLinePath += dirr;
          }
          break;
        case SignalStatePatternsExtraEnum.GREEN_EMPTY_CELL_PER_SECOND:
        case SignalStatePatternsExtraEnum.RED_EMPTY_CELL_PER_SECOND:
        case SignalStatePatternsExtraEnum.AMBER_EMPTY_CELL_PER_SECOND:
          for (let s = start; s < end; s++) {
            let tl = Constants.OFFSET + s * Constants.COLUMN_WIDTH;
            let tr =
              Constants.OFFSET +
              Constants.COLUMN_WIDTH +
              s * Constants.COLUMN_WIDTH;

            let ba = Constants.OFFSET + Constants.ROW_HEIGHT * 0.2;
            let br = Constants.OFFSET + Constants.ROW_HEIGHT * 0.8;
            mainLinePath += `M ${tl} ${ba} H ${tr} V ${br} H ${tl} Z `;
          }
          break;
        case SignalStatePatternsExtraEnum.GREEN_EMPTY_CELLS:
        case SignalStatePatternsExtraEnum.AMBER_EMPTY_CELLS:
        case SignalStatePatternsExtraEnum.RED_EMPTY_CELLS:
          let tl = Constants.OFFSET + start * Constants.COLUMN_WIDTH;
          let tr = Constants.OFFSET + (end - start) * Constants.COLUMN_WIDTH;

          let ba = Constants.OFFSET + Constants.ROW_HEIGHT * 0.2;
          let br = Constants.OFFSET + Constants.ROW_HEIGHT * 0.8;
          mainLinePath += `M ${tl} ${ba} H ${tr} V ${br} H ${tl} Z `;

          break;
      }
    }

    if (BASIC_SIGNALS.has(pattern)) {
      mainLinePath += path;
    }
    if (CUSTOM_SIGNALS_WITH_LINE.has(pattern)) {
      strokePath += path;
    }
    if (FLASHING_SIGNALS.has(pattern)) {
      strokePath += path;
    }
    if (STATES_SYMBOL.has(pattern)) {
      const arrowSize = 4;
      const downWards = 4;

      switch (pattern) {
        case SignalStatePolychromePatternEnum.RED_PRIVILEGE:
          strokePath += `M ${x1} ${y1 - 10}  L${x2} ${y2 - 10} `;
          break;
        case SignalStatePolychromePatternEnum.RED_STOP_CONFLICT_GROUPS:
          const lenght = x1 + Constants.COLUMN_WIDTH;
          strokePath += `M ${x1} ${y1 - 10} L${lenght} ${y1 - 10}  L${lenght} ${
            y2 + downWards
          } `;
          arrowPath += `M ${lenght - arrowSize} ${
            y2 - 10 + arrowSize
          }  L ${lenght} ${y2 - 10 + arrowSize + 1 + arrowSize} L ${
            lenght + arrowSize
          } ${y2 - 10 + arrowSize} Z`;
          break;
        case SignalStatePolychromePatternEnum.RED_CLEARENCE_AND_MIN:
          strokePath += `M ${x1} ${y1 - downWards - 6} L${x1} ${
            y1 + downWards + 6
          }   `;
          break;
        case SignalStatePolychromePatternEnum.PAST_END_GREEN:
          arrowPath += `M ${x1} ${y2 - arrowSize}  L ${x1} ${
            y2 + arrowSize
          } L ${x1 + arrowSize + 2} ${y2} Z`;
          break;
        case SignalStatePolychromePatternEnum.RED_WITH_REQUEST:
          strokePath += `M ${x1} ${y1 + 3}  L${x1} ${y2 + downWards + 8} `;
          arrowPath += `M ${x1 - arrowSize} ${y1 + arrowSize + 2}  L ${
            x1 + arrowSize
          } ${y1 + arrowSize + 2} L ${x1} ${y1 + 2} Z`;
          break;
        default:
          console.warn('Unsupported state');
          break;
      }
      mainLinePath += path;
    }

    if (MULTIPLE_COLORS_SIGNALS.has(pattern)) {
      switch (pattern) {
        case SignalStatePolychromePatternEnum.AMBER_GREEN:
        case SignalStatePolychromePatternEnum.AMBER_GREEN_FLASH:
          const [amber, green] = twoSignalsLayer({
            coords: { x1, y1, x2, y2 },
            first: SignalStatePatternsColors.AMBER,
            second: SignalStatePatternsColors.GREEN,
          });
          svg.appendChild(amber);
          svg.appendChild(green);
          break;
        case SignalStatePolychromePatternEnum.RED_GREEN:
          const [redg, rgreen] = twoSignalsLayer({
            coords: { x1, y1, x2, y2 },
            first: SignalStatePatternsColors.RED,
            second: SignalStatePatternsColors.GREEN,
          });
          svg.appendChild(redg);
          svg.appendChild(rgreen);
          break;

        case SignalStatePolychromePatternEnum.RED_AMBER:
          const [reda, ramber] = twoSignalsLayer({
            coords: { x1, y1, x2, y2 },
            first: SignalStatePatternsColors.RED,
            second: SignalStatePatternsColors.GREEN,
          });
          svg.appendChild(reda);
          svg.appendChild(ramber);
          break;
        case SignalStatePolychromePatternEnum.RED_AMBER_GREEN:
          const [redag, ramberg, ragr] = threeSignalLayer({
            coords: { x1, y1, x2, y2 },
            first: SignalStatePatternsColors.RED,
            second: SignalStatePatternsColors.AMBER,
            third: SignalStatePatternsColors.GREEN,
          });
          svg.appendChild(redag);
          svg.appendChild(ramberg);
          svg.appendChild(ragr);
          break;
        case SignalStatePatternsExtraEnum.GREEN_AMBER_DREEN:
          const [gr, amb, gr2] = threeSignalLayer({
            coords: { x1, y1, x2, y2 },
            first: SignalStatePatternsColors.GREEN,
            second: SignalStatePatternsColors.AMBER,
            third: SignalStatePatternsColors.GREEN,
          });
          svg.appendChild(gr);
          svg.appendChild(amb);
          svg.appendChild(gr2);
          break;
      }
    }
    const rectElement = document.createElementNS(svgNS, 'path');
    rectElement.setAttribute('d', mainLinePath);
    each(SignalStatePatternsColors[pattern]?.mainLine, (value, key) => {
      rectElement.setAttribute(key, value);
    });
    svg.appendChild(rectElement);

    if (arrowPath) {
      const rectElement = document.createElementNS(svgNS, 'path');
      rectElement.setAttribute('d', arrowPath);
      each(SignalStatePatternsColors[pattern]?.arrow, (value, key) => {
        rectElement.setAttribute(key, value);
      });
      svg.appendChild(rectElement);
    }
    if (strokePath) {
      const rectElement = document.createElementNS(svgNS, 'path');
      rectElement.setAttribute('d', strokePath);
      each(SignalStatePatternsColors[pattern]?.stroke, (value, key) => {
        rectElement.setAttribute(key, value);
      });
      svg.appendChild(rectElement);
    }
    if (extraPath) {
      const rectElement = document.createElementNS(svgNS, 'path');
      rectElement.setAttribute('d', extraPath);
      each(SignalStatePatternsColors[pattern]?.extra, (value, key) => {
        rectElement.setAttribute(key, value);
      });
      svg.appendChild(rectElement);
    }
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
