import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable()
export class SiplDataStorageService<T> {
    #dataSubject: BehaviorSubject<T[]> = new BehaviorSubject<T[]>([]);
    #siplStorage$: Observable<T[]> = this.#dataSubject.asObservable();

    public setData(data: T): void {
        this.#dataSubject.next([data]);
    }

    public addData(item: T): void {
        const current = this.#dataSubject.value;
        this.#dataSubject.next([...current, item]);
    }

    public clearData(): void {
        this.#dataSubject.next([]);
    }

    public getSiplBucketStorage(): Observable<T[]> {
        return this.#siplStorage$;
    }
}
