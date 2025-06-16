import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { SiplEngineService } from '../../services/sipl-engine.service';
import { combineLatest, map } from 'rxjs';
import { Constants, Label, SiplDiagramLabel } from '../../model/label';
import { Snapshot } from '../../model/snapshot';
import { createAndRenderLabel } from '../../helpers/draw-label';

@Component({
  selector: '[row-names-layer]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rows-names-layer.component.html',
})
export class RowsNamesLayerComponent {
  public rowNames?: SafeHtml;

  siplRowsCount$ = this.siplEngineService.labels$;
  constructor(
    private sanitizer: DomSanitizer,
    private siplEngineService: SiplEngineService
  ) {
    combineLatest({
      siplRows: this.siplRowsCount$,
    })
      .pipe(
        map(({ siplRows }) => this.#calculateNames(siplRows)),
        map((labels) => {
          console.log('labels', labels);
          return labels.map((label) => createAndRenderLabel(label));
        }),
        map((renderdLabels) => {
          return this.sanitizer.bypassSecurityTrustHtml(
            `<g>${renderdLabels.join('')}</g>`
          );
        })
      )
      .subscribe((renderdLabel) => {
        this.rowNames = renderdLabel;
      });
  }

  #calculateNames = (siplRows: SiplDiagramLabel[]): Label[] => {
    return siplRows.map((dataRow, index) => {
      const value = dataRow.name;
      const label: Label = {
        x: Constants.LABEL_LEFT_OFFSET,
        y:
          Constants.CHART_TOP_OFFSET +
          Constants.ROW_HEIGHT * index +
          Constants.ROW_HEIGHT / 2,
        value,
      } as Label;
      return label;
    });
  };
}
