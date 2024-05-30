import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DiffComparatorService } from '../../service/diff-compare.service';
import { TagModule } from 'primeng/tag';

import { map as Lmap, keyBy } from 'lodash';
import { TableModule } from 'primeng/table'; // Import TableModule
import { Observable, map } from 'rxjs';
import { CompareResult } from '../../service/models';

interface TableItem {
  keys: string[];
  results: {
    name: string;
    values: CompareResult[];
  }[];
  titles: CompareResult['value'][];
}

@Component({
  standalone: true,
  selector: 'diff-table',
  templateUrl: './diff-table.component.html',
  providers: [DiffComparatorService],
  imports: [CommonModule, TableModule, TagModule],
})
export class DiffTableComponent {
  diffResults$: Observable<TableItem> = this.diffComparator.diffResult.pipe(
    map((diff) => Lmap(diff, (diff) => keyBy(diff, (item) => item.key))),
    map((data) => {
      if (data && data.length) {
        // Get all keys
        const keys = Object.keys(data[0]);
        // Transform data to array of rows
        const titles = data.map((item) => item['name'].value);
        const results = keys.map((key) => {
          return {
            name: data[0][key].name,
            values: data.map((item) => item[key]),
          };
        });

        return { keys, results, titles };
      }
      return {
        keys: [],
        results: [],
        titles: [],
      };
    })
  );

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
