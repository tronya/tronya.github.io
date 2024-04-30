import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MoviesDTO } from '../movies.model';
import { PaginatorService } from './paginator.service';

@Injectable()
export class DataQueryService {
  private readonly link: string = 'https://api.themoviedb.org/3/discover/';
  marta = 0;
  constructor(
    private http: HttpClient,
    public paginatorService: PaginatorService
  ) {
    this.marta = Math.random();
  }

  getData(page: number) {
    return this.http.get<MoviesDTO>(
      this.link +
        `movie?include_adult=false&include_video=false&language=en-US&page=${page}&sort_by=popularity.desc`,
      {
        headers: {
          accept: 'application/json',
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkNjI2NTg3MTIyNjY0ZjJjZjIwNGE5MmI4NTI0ZDYzNSIsInN1YiI6IjVkY2RjN2UyMWQ3OGYyMDAxODI3ODFkYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.q7GdsJLvASo6uvfaz8WXuFDpXIxRO8fBapl9su_-W-E',
        },
      }
    );
  }
}
