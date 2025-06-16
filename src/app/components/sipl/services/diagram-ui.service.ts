import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Constants } from '../model/label';

@Injectable()
export class DiagramUiService {
  blackAndWhiteMode = new BehaviorSubject<boolean>(false);
  labelDragAndDropEnabled$ = new BehaviorSubject<boolean>(false);
  scrollableTopOffset = Constants.CHART_TOP_OFFSET;
  scrollableLeftOffset = Constants.CHART_LEFT_OFFSET;
  preferredWidth = new BehaviorSubject(0);
  preferredHeight = new BehaviorSubject(0);

  setDimensions({ width, height }: { width: number; height: number }): void {
    this.preferredHeight.next(height);
    this.preferredWidth.next(width);
  }
  setHeight(height: number): void {
    this.preferredHeight.next(
      Constants.CHART_TOP_OFFSET +
        height * Constants.ROW_HEIGHT +
        Constants.CHART_BOTTOM_OFFSET
    );
  }
  setWidth(width: number): void {
    this.preferredWidth.next(
      Constants.CHART_LEFT_OFFSET +
        width * Constants.COLUMN_WIDTH +
        Constants.CHART_RIGHT_OFFSET
    );
  }
}
