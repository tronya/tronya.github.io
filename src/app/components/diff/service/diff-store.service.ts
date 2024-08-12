import { Injectable } from '@angular/core';
import { remove } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { DiffModelsTypes } from './dto';
import { DiffItem, DiffTypes } from './models';

@Injectable({ providedIn: 'root' })
export class DiffStoreService {
  public compareItems: BehaviorSubject<DiffItem<DiffModelsTypes>[]> =
    new BehaviorSubject<DiffItem<DiffModelsTypes>[]>([]);

  addDiffItem(item: DiffModelsTypes, type: DiffTypes) {
    const existedItems = this.compareItems.getValue();

    const findIfExisted = existedItems.find(
      (existed) => existed.item.guid === item.guid && existed.type === type
    );
    if (findIfExisted) {
      remove(
        existedItems,
        (existedItem) =>
          existedItem.item.guid === item.guid && existedItem.type === type
      );
      this.compareItems.next(existedItems);
      return;
    }
    existedItems.push({ item, type });
    this.compareItems.next(existedItems);
  }
  clear() {
    this.compareItems.next([]);
  }
}
