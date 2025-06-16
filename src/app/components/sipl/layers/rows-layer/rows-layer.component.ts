import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SiplEngineService } from '../../services/sipl-engine.service';
import { Constants } from '../../model/label';
import { combineLatest, map } from 'rxjs';
import { Snapshot } from '../../model/snapshot';

@Component({
  selector: '[rows-layer]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rows-layer.component.html',
})
export class RowsLayerComponent {
  public rows?: SafeHtml;

  snapshots$ = this.siplEngineService.snapshots;
  siplRowsCount$ = this.siplEngineService.labels$;
  constructor(
    private sanitizer: DomSanitizer,
    private siplEngineService: SiplEngineService
  ) {
    combineLatest({
      snapshots: this.snapshots$,
      siplRows: this.siplRowsCount$,
    })
      .pipe(
        map(({ snapshots, siplRows }) =>
          this.#calculatePathData(snapshots, siplRows.length)
        ),
        map((path) => {
          console.log('path', path);
          return this.sanitizer.bypassSecurityTrustHtml(
            `<path stroke="white" d="${path}"/>`
          );
        })
      )
      .subscribe((path) => {
        this.rows = path;
      });
  }

  #calculatePathData = (snapshot: Snapshot[], siplRows: number): string => {
    let x1: number;
    let y1: number;
    let x2: number;
    let y2: number;
    let signalGroupPath: string = '';

    for (let i = 1; i <= siplRows; ++i) {
      x1 = Constants.LABEL_LEFT_OFFSET;
      y1 = Constants.CHART_TOP_OFFSET + i * Constants.ROW_HEIGHT;
      x2 =
        Constants.CHART_LEFT_OFFSET + snapshot.length * Constants.COLUMN_WIDTH;
      y2 = Constants.CHART_TOP_OFFSET + i * Constants.ROW_HEIGHT;

      signalGroupPath += 'M ' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2;
    }

    return signalGroupPath;
  };
}
