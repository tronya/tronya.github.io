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
import { BehaviorSubject, filter, map, tap } from 'rxjs';
import {
  ConfigGroup,
  ConfigReferance,
  ConfigTypes,
} from '../../../service/ConfigurationFactory';
import {
  CompareResult,
  ConfigurationReferance,
  TableData,
} from '../../../service/models';
import { flatten, map as lmap, uniq } from 'lodash';
import { DiffSectionGroupComponent } from '../diff-section-group/diff-section-group.component';

const defaultSection: ConfigReferance<ConfigTypes.ConfigReferance> = {
  type: ConfigTypes.ConfigReferance,
  config: {
    key: '',
    preload: false,
    method: {
      type: 'array',
      trackBy: '',
    },
    schemaRef: {
      name: '',
      headerKey: '',
      configuration: [],
    },
    collapsed: false,
    name: '',
  },
  items: [],
};

@Component({
    selector: 'diff-section-referance',
    templateUrl: './diff-section-referance.component.html',
    imports: [
        CommonModule,
        TableModule,
        PanelModule,
        ProgressBarModule,
        SelectButtonModule,
        ToggleButtonModule,
        //
        DiffSectionGroupComponent,
    ],
    host: { class: 'w-full' }
})
export class DiffSectionReferanceComponent {
  loaded = signal(false);
  loading = signal(false);
  collapsed = signal(false);
  title = signal('Placeholder for Title');

  section$ = new BehaviorSubject<ConfigReferance<ConfigTypes.ConfigReferance>>(
    defaultSection
  );

  tableData = this.section$.pipe(
    tap(() => {
      this.loading.set(true);
    }),
    map(({ config, items }) => this.referanceHelper(config, items)),
    tap(() => {
      this.loading.set(false);
      this.loaded.set(true);
    })
  );

  @Input() set section(section: ConfigReferance<ConfigTypes.ConfigReferance>) {
    const { collapsed, name } = section.config;
    this.collapsed.set(collapsed);
    this.title.set(name);

    this.section$.next(section);
  }

  public referanceHelper<T>(configuration: ConfigurationReferance, items: T[]) {
    const diffItemsData: T[][] = [];

    if (configuration.method.type === 'array') {
      const diffItems: T[][] = items.map(
        (item) => item[configuration.key as keyof T] || [] // empty array in case of no value
      ) as T[][];

      // console.log(config.schemaRef, diffItems);
      const allPossibleIds = lmap(
        flatten(diffItems),
        configuration.method.trackBy
      );
      const uniqByKey = uniq(allPossibleIds);
      const combinedByKey = uniqByKey.map((key) => {
        return diffItems.map((diffItem) => {
          return (
            diffItem.find(
              (di) => di[configuration.method.trackBy as keyof T] === key
            ) || (null as T)
          );
        });
      });

      diffItemsData.push(...combinedByKey);
    }

    const configurations = configuration.schemaRef.configuration.map(
      (section) => {
        return diffItemsData.map(
          (comparedItems) =>
            ({
              name:
                (comparedItems[0] as T)[configuration.schemaRef.headerKey as keyof T] ||
                section.name,
              config: {
                ...section,
                collapsed: true,
              },
              items: comparedItems,
              type: ConfigTypes.ConfigGroup,
            } as ConfigGroup<ConfigTypes.ConfigGroup>)
        );
      }
    );

    return configurations;
  }

  trackCourse(index: number) {
    return index;
  }
  trackSection(
    index: number,
    group: ConfigGroup<ConfigTypes.ConfigGroup>,
    sectionIndex: number
  ) {
    return group.config.name + index + sectionIndex;
  }
  stateChange(event: ToggleButtonChangeEvent) {
    // this.hideSame.set(!!event.checked);
  }
}
