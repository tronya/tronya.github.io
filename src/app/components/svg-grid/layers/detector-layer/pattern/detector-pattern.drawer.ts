import { Constants, DetectorPossiblePatternsEnum } from '../../../models';

export interface Points {
  start: number;
  end: number;
  row: number;
  offsetLeft: number;
  offsetTop: number;
  value: number;
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
  constructor({ start, end, row, offsetLeft, offsetTop, value }: Points) {
    this.x1 = offsetLeft + start * Constants.COLUMN_WIDTH ;
    this.x2 = offsetLeft + end * Constants.COLUMN_WIDTH;
    this.start = start;
    this.end = end;
    this.bottom = offsetTop + row * Constants.ROW_HEIGHT + Constants.ROW_HEIGHT;
    this.top = offsetTop + row * Constants.ROW_HEIGHT;
    this.value = value;
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
      bottom: this.bottom,
      top: this.top,
    };
  }
  public getRange(): Range {
    return {
      start: this.start,
      end: this.end,
    };
  }
  public getBasePath(): string {
    return `M ${this.x1} ${this.top} L${this.x2} ${this.top} L${this.x2} ${this.bottom} ${this.x1} ${this.bottom}`;
  }
}
