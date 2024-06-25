import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { map } from 'rxjs';
import { DiffCore } from './DiffCore';
import { DiffStoreService } from './diff-store.service';
import { CompareResult, DiffKeys, DiffModelsTypes, Table } from './models';

@Injectable()
export class DiffComparatorService {
  diffCore = this.diffStore.diffItems.pipe(map((items) => new DiffCore(items)));
  diffResult = this.diffCore.pipe(map((core) => this.compare(core)));

  constructor(
    private diffStore: DiffStoreService,
    private messageService: MessageService
  ) {}

  private diffItemsComperator(
    { key, name, nested, diffKeys }: DiffKeys,
    referanceItem: any,
    compareItem?: any
  ): CompareResult | CompareResult[] {
    if (nested) {
      return (
        diffKeys
          ?.map((diffKeys) => {
            const compare = compareItem ? compareItem[key] : compareItem;
            return this.diffItemsComperator(
              diffKeys,
              referanceItem[key],
              compare
            );
          })
          .flat() || []
      );
    }
    return {
      name,
      key,
      same: !compareItem ? true : referanceItem[key] === compareItem[key], // main logic is here
      value: !compareItem ? referanceItem[key] : compareItem[key],
      values:[]
    };
  }

  private groupHandler(
    schema: any,
    referanceItem: any,
    compareItem?: any
  ): Table {
    const configurations = schema.configuration.map((config: any) => {
      if (config.schemaRef) {
        if (config.array) {
          const rows = referanceItem[config.key].map((i: any) => {
            return this.groupHandler(config.schemaRef, i);
          });
          return {
            name: config.name,
            expanded: config.expanded,
            group: config.group,
            rows,
          };
        }
        return this.groupHandler(config.schemaRef, referanceItem[config.key]);
      }
      const rows = config.diffKeys
        .map((diifKeys: any) =>
          this.diffItemsComperator(diifKeys, referanceItem, compareItem)
        )
        .flat();

      return {
        name: config.name,
        expanded: config.expanded,
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
        data: [],
      };
    }

    const result: any = [];

    const referanceDiffIttem = diffItems[0] as unknown as any;
    const referanceItem = this.groupHandler(schema, referanceDiffIttem);

    for (let i = 1; i < diffItems.length; i++) {
      const item = this.groupHandler(schema, referanceDiffIttem, diffItems[i]);
      result.push(item);
    }

    const tableData: Table = {
      name: schema.name,
      data: [referanceItem, ...result],
    };

    return tableData;
  }
}
