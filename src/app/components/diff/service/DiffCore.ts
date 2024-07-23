import { DiffItem, DiffSchemaTypes, Schema } from './models';

export class DiffCore<T> {
  diffItems: T[];
  schema: Schema | null;
  constructor(items: DiffItem<T>[]) {
    this.diffItems = items.map((items) => items.item);
    this.schema = this.getSchema(items);
  }

  private getSchema(items: DiffItem<T>[]) {
    if (!items.length) {
      return null;
    }
    const reffItem = items[0];
    const allSimilar = items.every((item) => item.type === reffItem.type);
    if (allSimilar) {
      return DiffSchemaTypes[items[0].type];
    } else {
      return null;
    }
  }
}
