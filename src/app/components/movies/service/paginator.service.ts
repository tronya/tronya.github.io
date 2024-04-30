import {
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MoviesDTO } from '../movies.model';

type Paginator = Omit<MoviesDTO, 'results'>;

export const PAGINATOR_DEFAULT: Paginator = {
  page: 0,
  total_results: 0,
  total_pages: 0,
};
export const PAGINATOR_TOKEN = new InjectionToken<Paginator>('Paginator token');

@Injectable({ providedIn: 'root' })
export class PaginatorService {
  config = signal<Paginator>({ page: 0, total_results: 0, total_pages: 0 });

  activeNumbers = computed(() => this.paginatorFunction(this.config()));

  setConfig(config: Paginator) {
    this.config.set(config);
  }

  paginatorFunction(config: Paginator): number[] {
    const { page, total_pages } = config;
    // Display at most 2 pages before and after the selected page
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(total_pages, page + 2);

    // If there are fewer than 5 pages in total, adjust the start and end accordingly
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(total_pages, 5);
      } else {
        startPage = Math.max(1, total_pages - 4);
      }
    }

    // Generate the pages to display
    const pagesToDisplay: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pagesToDisplay.push(i);
    }
    if (page < total_pages - 5) {
      pagesToDisplay.push(total_pages);
    }
    return pagesToDisplay;
  }
}
