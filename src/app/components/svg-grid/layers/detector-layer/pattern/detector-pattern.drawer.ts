import { Constants, DetectorPossiblePatternsEnum } from '../../../models';

export interface Points {
  start: number;
  end: number;
  row: number;
  offsetLeft: number;
  offsetTop: number;
  value: number;
  color: string | null;
}

export interface PatternStyles {
  mainLinePath?: string;
  strokePath?: string;
  arrowPath?: string;
  extraPath?: string;
  rect?: { x: number; y: number; w: number; h: number };
}

export interface Bounds {
  x1: number;
  x2: number;
  bottom: number;
  top: number;
}

export interface Range {
  start: number;
  end: number;
}

class CoordsBuilder {
  public x1: number;
  public x2: number;
  public bottom: number;
  public top: number;
  public start: number;
  public end: number;
  public offsetLeft: number = 0;
  public offsetTop: number = 0;
  public row: number = 0;
  public value: number = 0;
  public color: string | null = null;
  constructor({
    start,
    end,
    row,
    offsetLeft,
    offsetTop,
    value,
    color,
  }: Points) {
    this.x1 = offsetLeft + start * Constants.COLUMN_WIDTH;
    this.x2 = offsetLeft + end * Constants.COLUMN_WIDTH;
    this.start = start;
    this.end = end;
    this.bottom = offsetTop + row * Constants.ROW_HEIGHT + Constants.ROW_HEIGHT;
    this.top =
      offsetTop +
      row * Constants.ROW_HEIGHT +
      Constants.DETECTOR_MAX_BAR_HEIGHT_GAP;
    this.value = value;
    this.color = color;
  }
}

export class DetectorPatternDrawer extends CoordsBuilder {
  public pattern: DetectorPossiblePatternsEnum;

  constructor(points: Points, pattern: DetectorPossiblePatternsEnum) {
    super(points);

    this.pattern = pattern;
  }
  public getBounds(): Bounds {
    return {
      x1: this.x1,
      x2: this.x2,
      bottom: this.bottom - 1,
      top: this.top,
    };
  }
  public rectWidth() {
    const { x1, x2 } = this.getBounds();
    return x2 - x1;
  }
  public rectHeight() {
    return Constants.ROW_HEIGHT - Constants.DETECTOR_MAX_BAR_HEIGHT_GAP - 1;
  }
  public getRange(): Range {
    return {
      start: this.start,
      end: this.end,
    };
  }
  public getBasePath(): string {
    const { x1, top, x2, bottom } = this.getBounds();
    return `M ${x1} ${top} L${x2} ${top} L${x2} ${bottom} L${x1} ${bottom} Z`;
  }
}
