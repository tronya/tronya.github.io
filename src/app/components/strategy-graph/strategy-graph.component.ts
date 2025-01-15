import { Component } from '@angular/core';
import { StrategyGraphTimelineComponent } from './strategy-graph-timeline/strategy-graph-timeline.component';

@Component({
    templateUrl: './strategy-graph.component.html',
    imports: [StrategyGraphTimelineComponent]
})
export class StrategyGraphComponent {}
