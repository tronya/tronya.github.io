import { uniqBy } from 'lodash';
import { BehaviorSubject } from 'rxjs';

export class Elevator {
  private floors: (number | string)[] = [];
  public floorQueue = new BehaviorSubject<Floor[]>([]);
  private position = new BehaviorSubject(0);

  constructor(floors: (number | string)[]) {
    this.floors = floors;
  }

  buttonClicked(floor: number) {
    const newFloor = new Floor(floor);
    const currentQueue = this.floorQueue.getValue();

    // Add the floor to the queue if it's not already present
    const updatedQueue = uniqBy([...currentQueue, newFloor], (f) => f.floor);
    this.floorQueue.next(updatedQueue);
  }

  getFloors(): readonly (number | string)[] {
    return [...this.floors];
  }

  getPosition() {
    return this.position.asObservable();
  }
}

class Floor {
  public floor: number | string;
  public inPlan: boolean;
  public doorOpen: boolean;
  public doorClosed: boolean;

  constructor(floor: string | number, inPlan: boolean = true) {
    this.floor = floor;
    this.inPlan = !!inPlan;
    this.doorOpen = false;
    this.doorClosed = true;
  }
}
