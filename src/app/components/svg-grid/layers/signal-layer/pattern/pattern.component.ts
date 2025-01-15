import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  Constants,
  SignalStatesPossiblePatterns
} from '../../../models';
import { getPattern } from './pattern.styles';
import { PatternDrawer } from './drawer.helper';

export interface SignalLayerItem {
  pattern: SignalStatesPossiblePatterns;
  start: number;
  end: number;
  row: number;
}

@Component({
    templateUrl: 'pattern.component.html',
    selector: '[signal-pattern]',
    imports: [CommonModule]
})
export class SignalPatternComponent {
  public template?: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {}

  @Input() set layer(layer: SignalLayerItem | undefined) {
    if (!layer) return;
    const config = {
      offsetLeft: Constants.OFFSET,
      offsetTop: Constants.OFFSET,
      start: layer.start,
      end: layer.end,
      row: layer.row,
    };

    const patternDrawer = new PatternDrawer(config, layer.pattern);
    const template = getPattern(patternDrawer);
    this.template = this.sanitizer.bypassSecurityTrustHtml(template);
  }
}
