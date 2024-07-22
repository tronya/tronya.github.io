import { BehaviorSubject } from 'rxjs';

export class DataStorage {
  private data = new BehaviorSubject<number[]>([]);

  addData(values: number[]): void {
    const currData = [...this.data.value];
    currData.push(...values);
    this.data.next(currData);
  }

  getItem(): number | undefined {
    const currData = [...this.data.value];
    const item = currData.shift();
    this.data.next(currData);
    return item;
  }

  getData() {
    return this.data;
  }
}
