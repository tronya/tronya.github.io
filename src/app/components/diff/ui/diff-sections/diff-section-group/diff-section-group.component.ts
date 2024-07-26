import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import {
  ToggleButtonChangeEvent,
  ToggleButtonModule,
} from 'primeng/togglebutton';
import { BehaviorSubject, delay, map, tap } from 'rxjs';
import {
  ConfigGroup,
  ConfigTypes,
} from '../../../service/ConfigurationFactory';
import { DiffComparatorService } from '../../../service/diff-compare.service';
import {
  CompareResult,
  ConfigurationGroup,
  isNestedDiffKey,
  TableData,
} from '../../../service/models';
import { isEmpty } from 'lodash';

const defaultSection: ConfigGroup<ConfigTypes.ConfigGroup> = {
  config: {
    collapsed: false,
    name: '',
    diffKeys: [],
  },
  items: [],
  type: ConfigTypes.ConfigGroup,
};

@Component({
  standalone: true,
  selector: 'diff-section-group',
  templateUrl: './diff-section-group.component.html',
  imports: [
    CommonModule,
    TableModule,
    PanelModule,
    ProgressBarModule,
    SelectButtonModule,
    ToggleButtonModule,
  ],
  host: { class: 'w-full' },
})
export class DiffSectionGroupComponent {
  @Input() set section(section: ConfigGroup<ConfigTypes.ConfigGroup>) {
    const { collapsed, name } = section.config;
    this.collapsed.set(collapsed);
    this.title.set(name);

    this.section$.next(section);
  }

  stateOptions: any[] = [
    { label: 'Show diff', value: 'showDiff' },
    { label: 'Show All', value: 'showAll' },
  ];

  loaded = signal(false);
  loading = signal(false);
  collapsed = signal(false);
  title = signal('Placeholder for Title');

  hideSame = signal(true);

  section$ = new BehaviorSubject<ConfigGroup<ConfigTypes.ConfigGroup>>(
    defaultSection
  );

  tableData = this.section$.pipe(
    tap(() => {
      this.loading.set(true);
    }),
    map(({ config, items }) => this.groupHandler(config, items)),
    // map((table) => ({
    //   ...table,
    //   rows: table.rows.filter((row) => !row.equalValues === this.hideSame()),
    // })),
    tap(() => {
      this.loading.set(false);
      this.loaded.set(true);
    })
  );

  constructor(private comparatorService: DiffComparatorService) {}

  public groupHandler<T>(
    configuration: ConfigurationGroup,
    items: T[]
  ): TableData {
    const rows: CompareResult[] = [];

    configuration.diffKeys.forEach((parent) => {
      // Nested Level Items
      if (isNestedDiffKey(parent)) {
        parent.diffKeys.forEach((keys) => {
          const squachItems = items.map((item) => {
            if(isEmpty(item)){
              return null;
            }
            const key = parent.key;
            if (item[key as keyof T]) {
              return item[key as keyof T];
            } else {
              throw `Can't find key ${parent.key} in object ${item}`;
            }
          });
          rows.push(
            this.comparatorService.diffItemsComperator(keys, squachItems)
          );
        });
      }
      // End Nested Level Items
      else {
        rows.push(this.comparatorService.diffItemsComperator(parent, items));
      }
    });

    const notEqualKeys = rows.filter((diff) => !diff.equalValues).length;
    return {
      name: configuration.name,
      collapsed: configuration.collapsed,
      loaded: true,
      notEqualKeys,
      itemsCount: items.length,
      rows,
    };
  }


  stateChange(event: ToggleButtonChangeEvent) {
    this.hideSame.set(!!event.checked);
  }
}
