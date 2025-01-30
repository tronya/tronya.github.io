import {
  BehaviorSubject,
  concatMap,
  delay,
  filter,
  from,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

export class Elevator {
  private floors: number[] = [];
  public floorQueue = new BehaviorSubject<Floor[]>([]);
  private position = new BehaviorSubject<number>(0);

  public activeFloors = this.floorQueue.pipe(
    startWith([]),
    map((floors) => floors.map((floor) => floor.floor))
  );

  constructor(floors: number[]) {
    this.floors = floors;

    this.floorQueue
      .pipe(
        tap((queue) =>
          console.log(
            '🚀 Queue Updated:',
            queue.map((f) => f.floor)
          )
        ),
        filter((floors) => floors.length > 0),
        concatMap((floors) => from(floors)), // Process floors sequentially
        switchMap((floor) => this.floorProcess(floor)), // Ensure sequential processing
        tap((floor) => console.log(`✅ Floor ${floor.floor} is DONE`))
      )
      .subscribe();
  }

  removeFloorFromQueue(floor: Floor) {
    const updatedQueue = this.floorQueue
      .getValue()
      .filter((f) => f.floor !== floor.floor);

    this.floorQueue.next(updatedQueue);
    console.log(`🚮 Removed Floor ${floor.floor} from Queue`);
  }

  floorProcess(floor: Floor) {
    return of(floor).pipe(
      tap(() => {
        this.position.next(floor.floor);
        console.log(`⬆️ Moving to Floor ${floor.floor}`);
      }),
      delay(1000),
      tap(() => (floor.status = FloorStatus.INPROGRESS)),
      tap(() => (floor.doorOpen = false)),
      delay(1000),
      tap(() => (floor.doorOpen = true)),
      delay(1000),
      tap(() => {
        floor.doorOpen = false;
        floor.status = FloorStatus.DONE;
      }),
      tap(() => this.removeFloorFromQueue(floor)) // Remove floor after completion
    );
  }

  buttonClicked(floor: number) {
    const newFloor = new Floor(floor);
    const currentQueue = this.floorQueue.getValue();

    if (!currentQueue.some((f) => f.floor === floor)) {
      console.log(`🛎️ Button pressed for Floor ${floor}`);
      this.floorQueue.next([...currentQueue, newFloor]);
    }
  }

  getFloors(): number[] {
    return [...this.floors];
  }

  getPosition() {
    return this.position.asObservable();
  }
}

export enum FloorStatus {
  DONE = 'DONE',
  INPROGRESS = 'INPROGRESS',
  WAITING = 'WAITING',
}

class Floor {
  public floor: number;
  public status: FloorStatus;
  public doorOpen: boolean;

  constructor(floor: number, status: FloorStatus = FloorStatus.WAITING) {
    this.floor = floor;
    this.status = status;
    this.doorOpen = false;
  }
}
