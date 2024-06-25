import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { DiffComparatorService } from '../../service/diff-compare.service';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table'; // Import TableModule
import { map, tap } from 'rxjs';
import { Table } from '../../service/models';

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
  imports: [CommonModule, TableModule, TagModule, ButtonModule],
})
export class DiffTableComponent {
  table$ = this.diffComparator.diffResult.pipe(
    tap((tap) => console.log(tap)),
    map((data) => this.groupDataTable(data)),
    tap((tap) => console.log(tap))
  );

  groupDataTable({ name, data }: Table): any[] {
    const table: any[] = [];
    const dataTable: any[] = [];
    data.forEach((group) => {
      const cluster = group.forEach((item) => {
        const groups: any[] = [];
        item.rows.forEach((row) => {
          const groupData = groups.find((g) => g.key === row.key);
          if (groupData) {
            groupData.values.push(row);
          } else {
            groups.push({
              key: row.key,
              name: row.name,
              values: [row],
            });
          }
        });
        return {
          expanded: item.expanded,
          group: item.group,
          name: item.name,
          rows: groups,
        };
      });
      table.push(cluster);
    });

    return dataTable;
  }

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
