import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { DotsTextComponent } from './components/dots-text/dots-text.component';
import { PlaygroundComponent } from './components/playground/playground.component';
import { NodesComponent } from './components/nodes/nodes.component';
import { MonoDash } from './components/mono-dash/mono-dash.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: MonoDash },
  { path: 'playground', component: PlaygroundComponent },
  // { path: 'nodes', component: NodesComponent },
  // { path: 'about', component: AboutComponent }
];
