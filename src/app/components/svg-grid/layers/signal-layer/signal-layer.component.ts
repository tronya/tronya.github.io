import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { values } from 'lodash';
import {
  BlackAndWhitePatternsEnum,
  SignalStatePatternsExtraEnum,
  SignalStatePolychromePatternEnum,
} from '../../models';
import {
  SignalLayerItem,
  SignalPatternComponent,
} from './pattern/pattern.component';

@Component({
    templateUrl: './signal-layer.component.html',
    selector: '[swarco-sipl-signal-layer]',
    imports: [SignalPatternComponent, CommonModule]
})
export class SiplSignalLayerComponent {
  layers: SignalLayerItem[] = [
    ...values(SignalStatePolychromePatternEnum),
    ...values(SignalStatePatternsExtraEnum),
    ...values(BlackAndWhitePatternsEnum),
  ].map((pattern, index) => {
    const start = index * 6 / 2
    return {
      pattern,
      start,
      end: start + 3,
      row: 3,
    };
  });

  trackByLayer(element: SignalLayerItem, index: number) {
    return element.pattern + index;
  }
}
