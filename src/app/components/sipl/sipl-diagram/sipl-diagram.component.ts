import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { tap } from 'rxjs';
import { SignalStateBucket } from '../model/Sipl';
import { DiagramUiService } from '../services/diagram-ui.service';
import { SiplDataStorageService } from '../services/signal-data-storage.service';
import { SnapshotService } from '../services/snaphot.service';
import { SiplDiagramLabel } from '../model/label';
import { SiplEngineService } from '../services/sipl-engine.service';
import { GridLayerComponent } from '../layers/grid-layer/grid-layer.component';
import { RowsLayerComponent } from '../layers/rows-layer/rows-layer.component';
import { RowsNamesLayerComponent } from '../layers/rows-names-layer/rows-names-layer.component';

@Component({
  selector: 'app-sipl-diagram',
  standalone: true,
  imports: [
    CommonModule,
    //
    GridLayerComponent,
    RowsLayerComponent,
    RowsNamesLayerComponent,
  ],
  providers: [
    SiplDataStorageService,
    SiplEngineService,
    SnapshotService,
    DiagramUiService,
    SiplDataStorageService,
  ],
  templateUrl: './sipl-diagram.component.html',
})
export class SiplDiagramComponent {
  constructor(
    public diagramUiService: DiagramUiService,
    private siplEngineService: SiplEngineService,
    private siplDataStorage: SiplDataStorageService<SignalStateBucket>
  ) {}
  pngDataUrl: string | null = null;

  @ViewChild('siplDiagram', { static: true }) siplDiagram!: ElementRef;

  @Input() public set data(bucket: SignalStateBucket) {
    this.siplDataStorage.setData(bucket);
  }
  @Input() public set labels(labels: SiplDiagramLabel[]) {
    this.siplEngineService.setLabels(labels);
  }

  convertToPng() {
    const svg = this.siplDiagram.nativeElement as SVGSVGElement;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    // Set canvas size to SVG size
    const width = svg.width?.baseVal.value || svg.clientWidth;
    const height = svg.height?.baseVal.value || svg.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        this.pngDataUrl = canvas.toDataURL('image/png');
      } else {
        console.error('2D context is not available.');
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  }

  // snapshots$ = this.#snapshotService
  //   .getSnapshots()
  //   .pipe(tap((data) => console.log(data)));
}
