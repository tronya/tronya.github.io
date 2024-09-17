import { Component } from '@angular/core';
import { values } from 'lodash';
import {
  SignalStatesPossiblePatterns,
  SignalStatePolychromePatternEnum,
  SignalStatePatternsExtraEnum,
  BlackAndWhitePatternsEnum,
} from './models';
import { PatternComponent } from './pattern/pattern.component';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  templateUrl: './svg-grid.component.html',
  imports: [PatternComponent, CommonModule],
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
