import { Routes } from '@angular/router';
import { DiffModule } from './components/diff/diff.module';
import { MonoDash } from './components/mono-dash/mono-dash.component';
import { PlaygroundComponent } from './components/playground/playground.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: MonoDash },
  { path: 'playground', component: PlaygroundComponent },
  { path: 'diff', loadChildren: () => DiffModule },
  // { path: 'nodes', component: NodesComponent },
  // { path: 'about', component: AboutComponent }
];
