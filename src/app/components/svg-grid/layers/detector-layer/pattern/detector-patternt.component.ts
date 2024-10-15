import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Constants, DetectorPossiblePatternsEnum } from '../../../models';
import { DetectorPatternDrawer } from './detector-pattern.drawer';
import { getDetectorPattern } from './detector.styles';

export interface DetectorLayerItem {
  pattern: DetectorPossiblePatternsEnum;
  start: number;
  end: number;
  row: number;
}

@Component({
  templateUrl: 'detector-patternt.component.html',
  selector: '[detector-pattern]',
  standalone: true,
  imports: [CommonModule],
})
export class DetectorPatternComponent {
  public template?: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {}

  @Input() set layer(layer: DetectorLayerItem | undefined) {
    if (!layer) return;
    const config = {
      offsetLeft: Constants.OFFSET,
      offsetTop: Constants.OFFSET,
      start: layer.start,
      end: layer.end,
      row: layer.row,
      value: 1,
    };

    const patternDrawer = new DetectorPatternDrawer(config, layer.pattern);
    const template = getDetectorPattern(patternDrawer);
    this.template = this.sanitizer.bypassSecurityTrustHtml(template);
  }
}
