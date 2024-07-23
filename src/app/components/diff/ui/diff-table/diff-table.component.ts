import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { DiffComparatorService } from '../../service/diff-compare.service';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table'; // Import TableModule
import { map, tap } from 'rxjs';
import { Table } from '../../service/models';
import { PanelModule } from 'primeng/panel';

// interface TableItem {
//   keys: string[];
//   results: {
//     name: string;
//     values: CompareResult[];
//   }[];
//   titles: CompareResult['value'][];
// }

@Component({
  standalone: true,
  selector: 'diff-table',
  templateUrl: './diff-table.component.html',
  providers: [DiffComparatorService],
  imports: [CommonModule, TableModule, TagModule, ButtonModule, PanelModule],
})
export class DiffTableComponent {
  table$ = this.diffComparator.diffResult.pipe(
    tap((tap) => console.log(tap))
    // map((data) => this.groupDataTable(data)),
    // tap((tap) => console.log(tap))
  );

  // groupDataTable({ name, data }: Table): any[] {
  //   return data.map((group) => {
  //     return group.map((item) => {
  //       const groups: any[] = [];
  //       item.rows.forEach((row) => {
  //         groups.push({
  //           key: row.key,
  //           name: row.name,
  //           values: [row],
  //         });
  //       });
  //       return {
  //         expanded: item.expanded,
  //         group: item.group,
  //         name: item.name,
  //         rows: groups,
  //       };
  //     });
  //   });
  // }

  constructor(private diffComparator: DiffComparatorService) {}

  getSeverity(value: boolean) {
    switch (value) {
      case true:
        return 'success';

      case false:
        return 'danger';
    }
  }
}
