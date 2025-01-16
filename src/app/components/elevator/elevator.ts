import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export class Elevator {
  private floors: (number | string)[] = [];
  private floorQueue = signal<Floor[]>([]);

  constructor(floors: (number | string)[]) {
    this.floors = floors;
  }

  buttonClicked(floor: number) {
    const floorClick = new Floor(floor);
    const isExists = this.floorQueue().some((f) => f.floor === floor);
    if (!isExists) {
      this.floorQueue().push(floorClick);
    }
    console.log(isExists, this.floorQueue());
  }

  countOfFlorsLength() {
    return this.floors.length;
  }

  getFloors() {
    return this.floors;
  }

  getQueue() {
    return this.floorQueue();
  }
}

class Floor {
  public floor: number | string;
  public destination: boolean;
  public doorOpen: boolean;

  constructor(floor: string | number, destination: boolean = false) {
    this.floor = floor;
    this.destination = !!destination;
    this.doorOpen = false;
  }
}
