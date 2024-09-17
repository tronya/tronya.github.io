import { Constants, SignalStatesPossiblePatterns } from '../models';

interface Coords {
  start: number;
  end: number;
}

class CoordsBuilder {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  constructor({ start, end }: Coords) {
    this.x1 = Constants.OFFSET + start;
    this.x2 = Constants.OFFSET + end * Constants.COLUMN_WIDTH;
    this.y1 = Constants.OFFSET + 0.5 * Constants.ROW_HEIGHT;
    this.y2 = Constants.OFFSET + 0.5 * Constants.ROW_HEIGHT;
  }
}

export class PatternDrawer extends CoordsBuilder {
  start: number;
  end: number;

  constructor({ start, end }: Coords, pattern: SignalStatesPossiblePatterns) {
    super({ start, end });

    this.start = start;
    this.end = end;
  }

  getBasePath(): string {
    return `M ${this.x1} ${this.y1} L${this.x2} ${this.y2}`;
  }

  getPattern() {

  }
}
