import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { map } from 'rxjs/operators';
import { DiffCore } from './DiffCore';
import { DiffStoreService } from './diff-store.service';
import {
  CompareResult,
  DiffKey,
  isDiffRef,
  isNestedDiffKey,
  isPossibleValuesType,
  NestedDiffKey,
  PossibleValuesTypes,
  Schema,
  Table,
  TableData,
} from './models';
import { DiffModelsTypes, Nodes } from './dto';

@Injectable()
export class DiffComparatorService {
  diffCore = this.diffStore.diffItems.pipe(map((items) => new DiffCore(items)));
  diffResult = this.diffCore.pipe(map((core) => this.compare(core)));

  constructor(
    private diffStore: DiffStoreService,
    private messageService: MessageService
  ) {}

  private diffItemsComperator<T>(
    diffKey: DiffKey | NestedDiffKey,
    refElements: T[]
  ): CompareResult {
    const nested = isNestedDiffKey(diffKey);
    console.log(nested);

    const { key, name } = diffKey;

    const values: PossibleValuesTypes[] = refElements.map((element) => {
      if (element?.hasOwnProperty(key)) {
        const value = element[key as keyof T];
        if (isPossibleValuesType(value)) {
          return value as PossibleValuesTypes;
        } else {
          console.error('we cant handle this type yet', value);
        }
      }
      return undefined;
    });

    const equalAll = values.every((v) => v == values[0]);
    const equalityValues = values.map((value) => ({
      value,
      equal: value === values[0],
    }));

    return {
      name,
      key,
      equalAll,
      values: equalityValues,
    };
  }

  private groupHandler<T>(schema: Schema, items: T[]): TableData[] {
    console.log(schema, items);
    const configurations = schema.configuration.map((config) => {
      const rows: CompareResult[] = [];

      if (isDiffRef(config)) {
        if (config.method.type === 'array') {
          const deffItems: T[][] = items.map(
            (item) => item[config.key as keyof T]
          ) as T[][];
          console.log(config.schemaRef, deffItems);
          deffItems.forEach((arrayWithItems, i) => {
            console.log(arrayWithItems, i);
            arrayWithItems.forEach((itemFromArray) => {
              const refItem = arrayWithItems.find(
                (arrayItem) =>
                  arrayItem[config.method.trackBy as keyof T] ===
                  itemFromArray[config.method.trackBy as keyof T]
              );
              // console.log(element[config.method.trackBy as keyof T]);
              console.log(refItem);
            });
          });
          // const data = [deffConfig[0][1] as T, deffConfig[0][2]];
          // const groupHandler = this.groupHandler(config.schemaRef, data);
          // rows.push(...groupHandler[0].rows)
          // console.log(groupHandler);
        }
      } else {
        config.diffKeys.forEach((parent) => {
          // Nested Level Items
          if (isNestedDiffKey(parent)) {
            parent.diffKeys.forEach((keys) => {
              const squachItems = items.map((item) => {
                const key = parent.key;
                if (item[key as keyof T]) {
                  return item[key as keyof T];
                } else {
                  throw `Can't find key ${parent.key} in object ${item}`;
                }
              });
              rows.push(this.diffItemsComperator(keys, squachItems));
            });
          }
          // End Nested Level Items
          else {
            rows.push(this.diffItemsComperator(parent, items));
          }
        });
      }

      return {
        name: config.name,
        collapsed: config.collapsed,
        group: config.group,
        rows,
      };
    });
    return configurations;
  }

  private compare(core: DiffCore<DiffModelsTypes>): Table {
    const { diffItems, schema } = core;
    if (!diffItems.length) {
      return {
        name: 'No data',
        headerKeys: [],
        itemsCount: 0,
        data: [],
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
        data: [],
      };
    }

    const data = this.groupHandler(schema, diffItems);

    const headerKeys = diffItems.map(
      (item) => item[schema.headerKey as keyof DiffModelsTypes] || 'Not Defined'
    );

    const tableData: Table = {
      name: schema.name,
      headerKeys,
      itemsCount: headerKeys.length,
      data,
    };

    return tableData;
  }
}
