import { Routes } from '@angular/router';
import { DiffModule } from './components/diff/diff.module';
import { MonoDash } from './components/mono-dash/mono-dash.component';
import { PlaygroundComponent } from './components/playground/playground.component';
import { NodesComponent } from './components/nodes/nodes.component';
import { LiveChuncks } from './components/live-chunks/live-chunks.component';
import { SvgGrid } from './components/svg-grid/svg-grid.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: MonoDash },
  { path: 'playground', component: PlaygroundComponent },
  { path: 'diff', loadChildren: () => DiffModule },
  { path: 'nodes', component: NodesComponent },
  { path: 'live-chunks', component: LiveChuncks },
  { path: 'svg-grid', component: SvgGrid },
];
