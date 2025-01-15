import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { values } from 'lodash';
import { TreeModule } from 'primeng/tree';
import { SiplSignalLayerComponent } from './layers/signal-layer/signal-layer.component';
import {
  BlackAndWhitePatternsEnum,
  SignalStatePatternsExtraEnum,
  SignalStatePolychromePatternEnum,
  SignalStatesPossiblePatterns,
} from './models';
import { DiagramComponent } from './diagram/diagram-sipl.component';

@Component({
    templateUrl: './svg-grid.component.html',
    imports: [CommonModule, TreeModule, DiagramComponent]
})
export class SvgGrid {
  public signalStatesPossiblePatterns: SignalStatesPossiblePatterns[] = values(
    SignalStatePolychromePatternEnum
  );

  public extraPatterns: SignalStatesPossiblePatterns[] = values(
    SignalStatePatternsExtraEnum
  );
  public blackAndWhitePatterns: SignalStatesPossiblePatterns[] = values(
    BlackAndWhitePatternsEnum
  );
}
