import { inject, Injectable } from '@angular/core';
import { SiplDataStorageService } from './signal-data-storage.service';
import { SignalStateBucket } from '../model/Sipl';
import { map, Observable } from 'rxjs';
import { Snapshot } from '../model/snapshot';
import dayjs, { Dayjs } from 'dayjs';
import { Constants } from '../model/label';
import { isNumber } from 'lodash';

@Injectable()
export class SnapshotService {
  snapshotsStart: Date = new Date();
  snapshotsEnd: Date = new Date();

  #snapShots: Observable<Snapshot[]>;

  private dataStorage = inject(SiplDataStorageService<SignalStateBucket>);

  constructor() {
    console.log('SnapshotService initialized');
    this.#snapShots = this.dataStorage
      .getSiplBucketStorage()
      .pipe(map((buckets) => this.#parseSnapshots(buckets[0])));
  }

  #parseSnapshots(stateBucket: SignalStateBucket): Snapshot[] {
    if (!stateBucket) {
      console.error('No state bucket provided');
      return [];
    }

    const bucketStartTime = stateBucket.start
      ? dayjs(stateBucket.start)
      : dayjs();

    const values = stateBucket.values ?? [];

    const memo = {
      prevTicks: { cycCnt: 0 },
      prevSnapshot: null as Partial<Snapshot> | null,
      offset: 0,
    };

    return values.map((value) => {
      const snapshotTime = bucketStartTime.add(value.offset, 'ms');
      const seconds = snapshotTime.second();

      const tick = value?.nodes?.[0]?.cycCnt ?? 0;

      const hasStart =
        (isNumber(tick) && !isNumber(memo.prevTicks?.cycCnt)) ||
        (isNumber(memo.prevTicks?.cycCnt) && tick < memo.prevTicks?.cycCnt);

      const labelDue = seconds % Constants.LABEL_ACCUMULATED === 0;
      const smallLine = seconds % Constants.LINE_ACCUMULATED === 0;

      if (hasStart) {
        memo.offset = tick === 1 ? 1 : 0;
        if (memo.prevSnapshot?.label) {
          memo.prevSnapshot.label = false;
        }
      }

      memo.prevTicks = {
        cycCnt: tick,
      };

      const sh: Snapshot = {
        date: snapshotTime,
        tx: tick,
        definition: undefined,
        start: hasStart,
        label: hasStart || (labelDue && !memo.prevSnapshot?.label),
        minuteStart: labelDue,
        line: labelDue ? 'large' : smallLine ? 'small' : '',
        startTime: snapshotTime,
        value: value,
        timeTick: snapshotTime.valueOf(),
      };
      memo.prevSnapshot = sh;
      return new Snapshot(sh);
    });
  }

  getSnapshots(): Observable<Snapshot[]> {
    return this.#snapShots;
  }

  getSnapShotsCount(): Observable<number> {
    return this.#snapShots.pipe(map((snapshots) => snapshots.length));
  }
}
