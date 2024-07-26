import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DiffStoreService } from '../../service/diff-store.service';

@Component({
  selector: 'diff-bar',
  templateUrl: './diff-bar.component.html',
  imports: [CommonModule],

  standalone: true,
})
export class DiffBarComponent {
  constructor(
    private diffStoreService: DiffStoreService,

  ) {
  }
  items = this.diffStoreService.compareItems;
}
