import { Routes } from '@angular/router';
import { DiffModule } from './components/diff/diff.module';
import { MonoDash } from './components/mono-dash/mono-dash.component';
import { PlaygroundComponent } from './components/playground/playground.component';
import { NodesComponent } from './components/nodes/nodes.component';
import { LiveChuncks } from './components/live-chunks/live-chunks.component';
import { SvgGrid } from './components/svg-grid/svg-grid.component';
import { ChartComponent } from './components/chart/chart.component';
import { StrategyGraphComponent } from './components/strategy-graph/strategy-graph.component';
import { ElevatorComponent } from './components/elevator/elevator.component';
import { MapComponent } from './components/map/map.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: MonoDash },
  { path: 'playground', component: PlaygroundComponent },
  { path: 'diff', loadChildren: () => DiffModule },
  { path: 'nodes', component: NodesComponent },
  { path: 'live-chunks', component: LiveChuncks },
  { path: 'svg-grid', component: SvgGrid },
  { path: 'chart', component: ChartComponent },
  { path: 'strategy', component: StrategyGraphComponent },
  { path: 'elevator', component: ElevatorComponent },
  { path: 'map', component: MapComponent },
];
