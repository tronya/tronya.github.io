import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { DiffCore } from './DiffCore';
import { DiffStoreService } from './diff-store.service';
import { CompareResult, DiffKeys, DiffModelsTypes } from './models';
import { MessageService } from 'primeng/api';

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
    };
  }

  private compare(core: DiffCore<DiffModelsTypes>) {
    const { diffItems, schema } = core;
    if (!diffItems.length) {
      return [];
    }

    if (!schema) {
      this.messageService.add({
        severity: 'warning',
        summary: 'No Schema Founded!',
        detail: 'No Schema founded for Comparison',
      });
      return;
    }

    const result: CompareResult[][] = [];

    const referanceItem = diffItems[0] as unknown as any;
    const referanceItemResult = schema.diffKeys
      .map((diifKeys) => this.diffItemsComperator(diifKeys, referanceItem))
      .flat();
    result.push(referanceItemResult);

    for (let i = 1; i < diffItems.length; i++) {
      const compareResults = schema.diffKeys
        .map((diffKeys) =>
          this.diffItemsComperator(diffKeys, referanceItem, diffItems[i])
        )
        .flat();
      result.push(compareResults);
    }
    return result;
  }
}
