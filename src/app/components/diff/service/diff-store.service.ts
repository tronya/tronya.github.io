import { Injectable } from '@angular/core';
import { remove } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { DiffItem, DiffModelsTypes, DiffTypes } from './models';

@Injectable({ providedIn: 'root' })
export class DiffStoreService {
  public diffItems: BehaviorSubject<DiffItem<DiffModelsTypes>[]> =
    new BehaviorSubject<DiffItem<DiffModelsTypes>[]>([]);

  addDiffItem(item: DiffModelsTypes, type: DiffTypes) {
    const existedItems = this.diffItems.getValue();

    const findIfExisted = existedItems.find(
      (existed) => existed.item.guid === item.guid && existed.type === type
    );

    if (findIfExisted) {
      remove(
        existedItems,
        (existedItem) =>
          existedItem.item.guid === item.guid && existedItem.type === type
      );
      this.diffItems.next(existedItems);
      return;
    }

    existedItems.push({ item, type });
    this.diffItems.next(existedItems);
  }
}
