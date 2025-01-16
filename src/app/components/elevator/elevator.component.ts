import { Component } from '@angular/core';
import { Elevator } from './elevator';
import {
  SelectButtonModule,
  SelectButtonOptionClickEvent,
} from 'primeng/selectbutton';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  templateUrl: './elevator.component.html',
  standalone: true,
  imports: [FormsModule, SelectButtonModule, CommonModule],
})
export class ElevatorComponent {
  private elevator = new Elevator(['-1', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  public activeFloors = this.elevator
    .getQueue()
    .map((activeFloors) => activeFloors.floor);
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
