import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { values } from 'lodash';
import { DetectorPossiblePatternsEnum } from '../../models';
import { DetectorPatternComponent } from './pattern/detector-patternt.component';

export interface DetectorLayerItem {
  pattern: DetectorPossiblePatternsEnum;
  start: number;
  end: number;
  row: number;
}

@Component({
  standalone: true,
  templateUrl: './detector-layer.component.html',
  selector: '[swarco-detector-signal-layer]',
  imports: [CommonModule, DetectorPatternComponent],
})
export class DetectorLayerComponent {
  layers: DetectorLayerItem[] = [...values(DetectorPossiblePatternsEnum)].map(
    (pattern, index) => {
      const iterator = index * 2;
      return {
        pattern,
        start: iterator + 1,
        end: iterator + 2,
        row: 1,
      };
    }
  );
}
