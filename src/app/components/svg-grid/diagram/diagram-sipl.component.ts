import { Component } from '@angular/core';
import { GridLayerComponent } from '../layers/grid/grid.component';
import { SiplSignalLayerComponent } from '../layers/signal-layer/signal-layer.component';
import { DetectorLayerComponent } from '../layers/detector-layer/detector-layer.component';

@Component({
  templateUrl: 'diagram-sipl.component.html',
  selector: 'diagram-sipl',
  standalone: true,
  imports: [
    SiplSignalLayerComponent,
    GridLayerComponent,
    DetectorLayerComponent,
  ],
})
export class DiagramComponent {}
