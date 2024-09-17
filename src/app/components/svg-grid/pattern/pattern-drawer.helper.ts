import { ElementRef } from '@angular/core';
import {
  BASIC_SIGNALS,
  BLACK_AND_WHITE_PATTERNS,
  Constants,
  CUSTOM_SIGNALS_STYLES,
  CUSTOM_SIGNALS_WITH_LINE,
  FLASHING_SIGNALS,
  MULTIPLE_COLORS_SIGNALS,
  SignalStatesPossiblePatterns,
  STATES_SYMBOL,
} from '../models';
import {
  calculateBlackAndWhitePattern,
  customSignalsPatterns,
  multipleColorsPatterns,
  stateSymbolsPatterns,
} from './patterns.helpers';

export interface Points {
  start: number;
  end: number;
}

export interface PatternStyles {
  mainLinePath?: string;
  strokePath?: string;
  arrowPath?: string;
  extraPath?: string;
  rect?: { x: number; y: number; w: number; h: number } | undefined;
}

export interface Bounds {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

class CoordsBuilder {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  constructor({ start, end }: Points) {
    this.x1 = Constants.OFFSET + start;
    this.x2 = Constants.OFFSET + end * Constants.COLUMN_WIDTH;
    this.y1 = Constants.OFFSET + 0.5 * Constants.ROW_HEIGHT;
    this.y2 = Constants.OFFSET + 0.5 * Constants.ROW_HEIGHT;
  }

  getBounds(): Bounds {
    return { x1: this.x1, x2: this.x2, y1: this.y1, y2: this.y2 };
  }
}

export class PatternDrawer extends CoordsBuilder {
  start: number;
  end: number;
  pattern: SignalStatesPossiblePatterns;
  svg: ElementRef;

  constructor(
    { start, end }: Points,
    pattern: SignalStatesPossiblePatterns,
    svg: ElementRef
  ) {
    super({ start, end });

    this.pattern = pattern;
    this.start = start;
    this.end = end;
    this.svg = svg;
  }

  getBasePath(): string {
    return `M ${this.x1} ${this.y1} L${this.x2} ${this.y2}`;
  }

  getPattern(): PatternStyles {
    const pattern = this.pattern;
    const bounds = this.getBounds();
    const basePath = this.getBasePath();

    if (BLACK_AND_WHITE_PATTERNS.has(pattern)) {
      return calculateBlackAndWhitePattern(pattern, bounds, basePath);
    }
    if (BASIC_SIGNALS.has(pattern)) {
      return {
        mainLinePath: basePath,
      };
    }
    if (CUSTOM_SIGNALS_WITH_LINE.has(pattern)) {
      return {
        strokePath: basePath,
      };
    }
    if (FLASHING_SIGNALS.has(pattern)) {
      return { strokePath: basePath, mainLinePath: basePath };
    }

    if (STATES_SYMBOL.has(pattern)) {
      return stateSymbolsPatterns(pattern, bounds, basePath);
    }

    if (MULTIPLE_COLORS_SIGNALS.has(pattern)) {
      return multipleColorsPatterns(pattern, bounds, basePath, this.svg);
    }

    if (CUSTOM_SIGNALS_STYLES.has(pattern)) {
      const points: Points = { start: this.start, end: this.end };
      return customSignalsPatterns(pattern, points, bounds, basePath);
    }

    return {
      mainLinePath: '',
      arrowPath: '',
      rect: undefined,
      strokePath: '',
      extraPath: '',
    };
  }
}
