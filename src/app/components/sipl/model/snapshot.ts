import { Values } from './Sipl';
import dayjs from 'dayjs';

export interface SnapshotInterface {
  value: Values;
  timeTick: number;
  tx: any;
  line: string;
  start: boolean;
  label: boolean;
  definition: any;
  minuteStart: boolean;
  date: dayjs.Dayjs;
  startTime?: dayjs.Dayjs;
}

export class Snapshot implements SnapshotInterface {
  value: Values;
  timeTick: number;
  tx: any;
  line: string;
  start: boolean;
  label: boolean;
  definition: any;
  minuteStart: boolean;
  date: dayjs.Dayjs;
  startTime?: dayjs.Dayjs;

  constructor({
    value,
    timeTick,
    tx,
    line,
    start,
    label,
    definition,
    minuteStart,
    date,
    startTime,
  }: SnapshotInterface) {
    this.value = value;
    this.timeTick = timeTick;
    this.tx = tx;
    this.line = line;
    this.start = start;
    this.label = label;
    this.definition = definition;
    this.minuteStart = minuteStart;
    this.date = date;
    this.startTime = startTime;
  }
}
