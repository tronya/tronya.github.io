import {
  Component,
  InputSignal,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Movie } from '../movies.model';
import { CommonModule } from '@angular/common';
import { DataQueryService } from '../service/data-query.service';
import {} from '@angular/common/http';

@Component({
    templateUrl: './movie.component.html',
    selector: 'movie',
    imports: [CommonModule],
    host: { class: 'm-4' },
    providers: [DataQueryService]
})
export class MovieComponent {
  imageUrl = 'https://image.tmdb.org/t/p/w500';
  movie: InputSignal<Movie> = input<Movie>({} as Movie);
  loaded = signal(false);

  constructor(private ds: DataQueryService) {
    // this.ds.getData(5).subscribe((res) => console.log(res));
  }
  imageLoaded(event: Event) {
    // console.log('loaded');
    console.log(this.ds.marta)
    this.loaded.set(true);
  }
}
