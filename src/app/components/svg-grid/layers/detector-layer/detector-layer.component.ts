import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { values } from 'lodash';
import { DetectorPossiblePatternsEnum } from '../../models';
import {
  DetectorLayerItem,
  DetectorPatternComponent,
} from './pattern/detector-patternt.component';

@Component({
  templateUrl: './detector-layer.component.html',
  selector: '[swarco-detector-signal-layer]',
  imports: [CommonModule, DetectorPatternComponent],
})
export class DetectorLayerComponent {
  trackByPattern(index: number, layer: DetectorLayerItem): string {
    return layer.pattern;
  }
  layers: DetectorLayerItem[] = [
    {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 2,
      end: 3,
      row: 1,
      value: 150,
      color: 'violet',
    },
    {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 3,
      end: 4,
      row: 1,
      value: 59,
      color: 'pink',
    },
    {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 4,
      end: 5,
      row: 1,
      value: 10,
      color: 'green',
    },
    {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 5,
      end: 6,
      row: 1,
      value: 29,
      color: 'orange',
    },
    {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 6,
      end: 7,
      row: 1,
      value: 75,
      color: 'purple',
    },
    {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 7,
      end: 8,
      row: 1,
      value: 90,
      color: 'red',
    },
        {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 8,
      end: 9,
      row: 1,
      value: 65,
      color: 'darkblue',
    },
            {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 9,
      end: 10,
      row: 1,
      value: 34,
      color: 'white',
    },
            {
      pattern: DetectorPossiblePatternsEnum.DETECTOR_PATTERN_COLOR,
      start: 10,
      end: 11,
      row: 1,
      value: 100,
      color: 'purple',
    },
    ...values(DetectorPossiblePatternsEnum).map((pattern, index) => {
      const iterator = 10 + index * 15;
      return {
        pattern,
        start: iterator + 1,
        end: iterator + 16,
        row: 1,
        value: 57,
        color: 'green',
      };
    }),
  ];
}
