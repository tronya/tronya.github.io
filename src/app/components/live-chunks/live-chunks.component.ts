import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { RxLet } from '@rx-angular/template/let';
import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  combineLatest,
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  interval,
  map,
  mergeMap,
  switchMap,
  take,
  timer,
  withLatestFrom,
} from 'rxjs';
import { DataStorage } from './DataStorage';
import { startsWith } from 'lodash';

@Component({
    templateUrl: 'live-chunks.component.html',
    imports: [RxLet, CommonModule]
})
export class LiveChuncks implements OnDestroy {
  private index = 0;
  private actualSecond = signal(0);
  public second = timer(0, 1000);
  constructor() {
    setInterval(() => {
      const text = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [],
        [],
        [],
        [],

        [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
        [22, 23, 24, 25],
        [26, 27, 28, 29],
        [],
        [],
        [30, 31, 32, 33, 34, 35, 36, 37, 38],
        [39, 40, 41],
        [],
        [45, 46, 47, 48, 49],
        [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 50],
      ];
      // const random = Math.floor(Math.random() * (text.length - 0)) + 0;

      const randomText = text[this.index] || [];
      if (this.index >= text.length) {
        this.index = 0;
      } else {
        this.index++;
      }
      this.dataStorage.addData(randomText);
    }, 3000);
  }
  private dataStorage = new DataStorage();
  private destroy$ = new Subject<void>();

  speed = this.dataStorage.getData().pipe(
    map((data) => {
      const length = data.length;
      if (length > 10) {
        return 300;
      } else if (length < 5) {
        return 1000;
      } else {
        return 1000;
      }
    }),
    distinctUntilChanged()
  );
  interval = this.speed.pipe(switchMap((speed) => interval(speed)));

  engine = this.interval.pipe(
    withLatestFrom(this.dataStorage.getData()),
    map(([tick, data]) => {
      this.actualSecond.set(this.actualSecond() + 1);
      const interval = this.actualSecond();
      const item = this.dataStorage.getItem();
      console.log(data, item, interval);
      return {
        data,
        item,
        interval,
        tick,
      };
    })
  );

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
