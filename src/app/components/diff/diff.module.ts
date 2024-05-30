import { NgModule } from '@angular/core';
import { DiffComponent } from './diff.component';
import { RouterModule, Routes } from '@angular/router';
const routes: Routes = [{ path: '', component: DiffComponent }];

@NgModule({
  imports: [DiffComponent, RouterModule.forChild(routes)],
})
export class DiffModule {}
