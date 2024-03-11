import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { DotsTextComponent } from './components/dots-text/dots-text.component';
import { PlaygroundComponent } from './components/playground/playground.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: DotsTextComponent },
  { path: 'playground', component: PlaygroundComponent },
  // { path: 'about', component: AboutComponent }
];
