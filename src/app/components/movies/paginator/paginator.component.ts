import { Component, effect, output } from '@angular/core';
import { PaginatorService } from '../service/paginator.service';

@Component({
  selector: 'paginator',
  templateUrl: './paginator.component.html',
  standalone: true,
})
export class PaginatorComponent {
  constructor(public paginator: PaginatorService) {}

  activePage = output<number>();
  activeNumbers = this.paginator.activeNumbers;

  pageClicked(page: number) {
    this.activePage.emit(page);
  }
}
