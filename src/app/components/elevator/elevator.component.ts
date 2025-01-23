import { Component } from '@angular/core';
import { Elevator } from './elevator';
import {
  SelectButtonModule,
  SelectButtonOptionClickEvent,
} from 'primeng/selectbutton';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map, switchMap, tap } from 'rxjs';

@Component({
  templateUrl: './elevator.component.html',
  styleUrls: ['./elevator.component.scss'],
  standalone: true,
  imports: [FormsModule, SelectButtonModule, CommonModule],
})
export class ElevatorComponent {
  private elevator = new Elevator([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  public activeFloors: (string | number)[] = [];

  public queue = this.elevator.floorQueue.pipe(
    tap((floors) => {
      this.activeFloors = floors.map((floor) => floor.floor);
    })
  );

  public position = this.elevator.getPosition();

  public floorsNumbers = this.elevator
    .getFloors()
    .map((floor) => ({ name: `Floor ${floor}`, value: floor }));

  constructor() {}

  public floors() {
    return this.elevator.getFloors();
  }

  public clickingFloor(event: SelectButtonOptionClickEvent) {
    this.elevator.buttonClicked(event.option.value);
  }
}
