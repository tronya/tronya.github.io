import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { SiplEngineService } from '../../services/sipl-engine.service';
import { Snapshot } from '../../model/snapshot';
import { index } from 'd3';
import { Constants } from '../../model/label';
import { combineLatest, map } from 'rxjs';

@Component({
  selector: '[grid-layer]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid-layer.component.html',
})
export class GridLayerComponent {
  gridDepicted = false;

  public accumulated?: SafeHtml;
  public intervalStart?: SafeHtml;
  public second?: SafeHtml;
  snapshots$ = this.siplEngineService.snapshots;
  siplRowsCount$ = this.siplEngineService.labels$;

  generateGrid(snapshots: Snapshot[], siplRows: number) {
    let intervalStart = '';
    let accumulated = '';
    let second = '';
    snapshots.reduce(
      (memo, snapshot, index) => {
        // console.log(memo, snapshot, index);
        let x1: number =
            Constants.CHART_LEFT_OFFSET + index * Constants.COLUMN_WIDTH,
          y1: number = Constants.CHART_TOP_OFFSET,
          x2: number =
            Constants.CHART_LEFT_OFFSET + index * Constants.COLUMN_WIDTH,
          y2: number =
            Constants.CHART_TOP_OFFSET + siplRows * Constants.ROW_HEIGHT;

        if (snapshot.line === 'large' || snapshot.start) {
          y1 -= Constants.GRID_LARGE_OVERHANG;
        } else if (snapshot.line) {
          y1 -= Constants.GRID_SMALL_OVERHANG;
        }

        const path: string = 'M ' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2;
        if (snapshot.start) {
          // memo.intervalStart.d += path;
          intervalStart += path;
          // this.helperService.setAttribute(
          //   memo.intervalStart.p,
          //   'd',
          //   memo.intervalStart.d
          // );
        } else if (snapshot.line) {
          accumulated += path;
          // this.helperService.setAttribute(
          //   memo.accumulated.p,
          //   'd',
          //   memo.accumulated.d
          // );
          if (!this.gridDepicted) {
            second += path;
            // this.helperService.setAttribute(memo.second.p, 'd', memo.second.d);
          }
        } else {
          if (!this.gridDepicted) {
            second += path;
            // this.helperService.setAttribute(memo.second.p, 'd', memo.second.d);
          }
        }

        return memo;
      },
      {
        accumulated: { d: '', p: null },
        intervalStart: { d: '', p: null },
        second: { d: '', p: null },
      }
    );
    return {
      accumulated,
      second,
      intervalStart,
    };
  }

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
          this.generateGrid(snapshots, siplRows.length)
        )
      )
      .subscribe(({ accumulated, second, intervalStart }) => {
        this.accumulated = this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke="white" d="${accumulated}"/>`
        );
        this.second = this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke="white" d="${second}"/>`
        );
        this.intervalStart = this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke="white" d="${intervalStart}"/>`
        );
      });
  }
}
