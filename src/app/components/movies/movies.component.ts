import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  Component,
  Injector,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MovieComponent } from './movie/movie.componet';
import { Movie, MoviesDTO } from './movies.model';
import { PaginatorComponent } from './paginator/paginator.component';
import {
  PAGINATOR_DEFAULT,
  PAGINATOR_TOKEN,
  PaginatorService,
} from './service/paginator.service';
import { DataQueryService } from './service/data-query.service';
import { map } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  templateUrl: './movies.component.html',
  selector: 'movies',
  standalone: true,
  imports: [CommonModule, MovieComponent, PaginatorComponent],
  providers: [DataQueryService],
})
export class Movies {
  page: WritableSignal<number> = signal(1);
  movies: WritableSignal<Movie[]> = signal([]);

  constructor(
    private dataQuery: DataQueryService,
    private paginatorService: PaginatorService
  ) {
    console.log(this.dataQuery.marta);
    effect(() => {
      const page = this.page();
      // console.log(page);
      this.dataQuery
        .getData(page)
        .pipe(
          map(({ page, total_pages, total_results, results }) => {
            this.paginatorService.setConfig({
              page,
              total_pages,
              total_results,
            });
            this.movies.set(results);
          })
        )
        .subscribe();
    });
  }

  pageClicked(page: number) {
    this.page.set(page);
  }
}
