import { Component } from '@angular/core';
import { Elevator } from './elevator';
import {
  SelectButtonModule,
  SelectButtonOptionClickEvent,
} from 'primeng/selectbutton';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map, Observable, switchMap, tap } from 'rxjs';

@Component({
  templateUrl: './elevator.component.html',
  styleUrls: ['./elevator.component.scss'],
  standalone: true,
  imports: [FormsModule, SelectButtonModule, CommonModule],
})
export class ElevatorComponent {
  private elevator = new Elevator([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  public activeFloors: number[] = [];
  private margin = 10;
  private floorHeight = 80;

  public position = this.elevator.getPosition().pipe(
    map((floorCount) => floorCount * this.floorHeight - this.floorHeight)
  );

  public floorsNumbers = this.elevator
    .getFloors()
    .map((floor) => ({ name: `Floor ${floor}`, value: floor }));

  constructor() {
    this.elevator.activeFloors
      .pipe(
        tap((res) => {
          this.activeFloors = res;
        })
      )
      .subscribe();
  }

  public floors() {
    return this.elevator.getFloors();
  }

  public clickingFloor(event: SelectButtonOptionClickEvent) {
    this.elevator.buttonClicked(event.option.value);
  }
}
