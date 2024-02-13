import { Component, Input, OnInit } from '@angular/core';
import { CharacterComponent } from '../character/character.component';
import { CommonModule } from '@angular/common';
import { NUMBERS_MAP } from '../character/numbers';

@Component({
  selector: 'digits',
  standalone: true,
  templateUrl: './digits.component.html',
  imports: [CommonModule, CharacterComponent],
})
export class DigitsComponent {
  digits$: number[][][] = [];
  @Input() set number(amount: string) {
    this.digits$ = amount.split('').map((character) => NUMBERS_MAP[character]);
  }
}
