import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

import { map } from 'rxjs';
import { ConfigurationFactory } from './ConfigurationFactory';
import { DiffCore } from './DiffCore';
import { DiffStoreService } from './diff-store.service';
import { DiffModelsTypes } from './dto';
import {
  CompareResult,
  Configuration,
  ConfigurationGroup,
  DiffKey,
  isConfigurationReferance,
  isNestedDiffKey,
  isPossibleValuesType,
  NestedDiffKey,
  PossibleValuesTypes,
  Schema,
  Table,
  TableData,
  TableParentConfig,
} from './models';
import { isEmpty } from 'lodash';

@Injectable()
export class DiffComparatorService {
  diffCore = this.diffStore.compareItems.pipe(
    map((items) => new DiffCore(items))
  );
  diffResult = this.diffCore.pipe(map((core) => this.generateRootConfig(core)));

  constructor(
    private diffStore: DiffStoreService,
    private messageService: MessageService
  ) {}

  public diffItemsComperator<T>(
    diffKey: DiffKey | NestedDiffKey,
    refElements: T[]
  ): CompareResult {
    const { key, name } = diffKey;

    const values: PossibleValuesTypes[] = refElements.map((element) => {
      if( isEmpty(element)){
        return undefined;
      };
      if (element?.hasOwnProperty(key)) {
        const value = element[key as keyof T];

        if (isPossibleValuesType(value)) {
          if (typeof value === 'string' && value.length === 0) {
            return '-';
          }
          return value;
        } else if (value == null) {
          return 'null';
        } else {
          console.error('we cant handle this type yet', value);
        }
      }
      console.warn(`we can not find this key ${key}`);
      return undefined;
    });

    const equalAll = values.every((v) => v == values[0]);
    const compareValues = values.map((value) => ({
      value,
      equal: value === values[0],
    }));

    return {
      name,
      key,
      equalValues: equalAll,
      values: compareValues,
    };
  }

  private getParrentTables<T>(schema: Schema, items: T[]) {
    const configurations: TableParentConfig<T>[] = [];
    schema.configuration.forEach((configuration) => {
      const config = new ConfigurationFactory<
        Configuration,
        T
      >().getConfiguration(configuration, items);
      if (!config) return;
      configurations.push(config);
    });

    return configurations;
  }

  // if (config.preload) {
  //   if (config.method.type === 'array') {
  //     const diffItems: T[][] = items.map(
  //       (item) => item[config.key as keyof T] || [] // empty array in case of no value
  //     ) as T[][];
  //     // console.log(config.schemaRef, diffItems);
  //     const allPossibleIds = lmap(
  //       flatten(diffItems),
  //       config.method.trackBy
  //     );
  //     const uniqByKey = uniq(allPossibleIds);
  //     const combinedByKey = uniqByKey.map((key) => {
  //       return diffItems.map((diffItem) => {
  //         return (
  //           diffItem?.find(
  //             (di) => di[config.method.trackBy as keyof T] === key
  //           ) || ({} as T)
  //         );
  //       });
  //     });
  //     // adding to diff
  //     const diff = combinedByKey.map((combEl, index) => {
  //       return this.groupHandler(config.schemaRef, combEl)[0];
  //     });
  //     return {
  //       name: config.name,
  //       collapsed: config.collapsed,
  //       group: config.group,
  //       rows: diff,
  //     };
  //   }
  // }

  private generateRootConfig(
    core: DiffCore<DiffModelsTypes>
  ): Table<DiffModelsTypes> {
    const { diffItems, schema } = core;
    if (!diffItems.length) {
      return {
        name: 'No data',
        headerKeys: [],
        itemsCount: 0,
        parentConfig: [],
      };
    }

    if (!schema) {
      this.messageService.add({
        severity: 'warning',
        summary: 'No Schema Founded!',
        detail: 'No Schema founded for Comparison',
      });
      return {
        name: 'No data',
        headerKeys: [],
        itemsCount: 0,
        parentConfig: [],
      };
    }

    const parentConfig = this.getParrentTables<DiffModelsTypes>(
      schema,
      diffItems
    );

    const headerKeys = diffItems.map(
      (item) => item[schema.headerKey as keyof DiffModelsTypes] || 'Not Defined'
    );

    return {
      name: schema.name,
      headerKeys,
      itemsCount: headerKeys.length,
      parentConfig,
    };
  }
}
