import { Constants, SignalStatesPossiblePatterns } from "../../../models";

export interface Points {
    start: number;
    end: number;
    row: number;
    offsetLeft: number;
    offsetTop: number;
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
    center: number;
}

export interface Range {
    start: number;
    end: number;
}

class CoordsBuilder {
    public x1: number;
    public x2: number;
    public center: number;
    public start: number;
    public end: number;
    public offsetLeft: number = 0;
    public offsetTop: number = 0;
    public row: number = 0;
    constructor({ start, end, row, offsetLeft, offsetTop }: Points) {
        this.x1 = offsetLeft + start * Constants.COLUMN_WIDTH;
        this.x2 = offsetLeft + end * Constants.COLUMN_WIDTH;
        this.start = start;
        this.end = end;
        this.center = offsetTop + row * Constants.ROW_HEIGHT + 0.5 * Constants.ROW_HEIGHT;
    }
}

export class PatternDrawer extends CoordsBuilder {
    public pattern: SignalStatesPossiblePatterns;

    constructor(points: Points, pattern: SignalStatesPossiblePatterns) {
        super(points);

        this.pattern = pattern;
    }
    public getBounds(): Bounds {
        return {
            x1: this.x1,
            x2: this.x2,
            center: this.center,
        };
    }
    public getRange(): Range {
        return {
            start: this.start,
            end: this.end,
        };
    }
    public getBasePath(): string {
        return `M ${this.x1} ${this.center} L${this.x2} ${this.center}`;
    }
}
