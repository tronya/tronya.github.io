import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { DiffComparatorService } from '../../service/diff-compare.service';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table'; // Import TableModule
import { ConfigTypes } from '../../service/ConfigurationFactory';
import { DiffSectionGroupComponent } from '../diff-sections/diff-section-group/diff-section-group.component';
import { DiffSectionReferanceComponent } from '../diff-sections/diff-section-referance/diff-section-referance.component';
@Component({
    selector: 'diff-table',
    templateUrl: './diff-table.component.html',
    providers: [DiffComparatorService],
    imports: [
        CommonModule,
        TableModule,
        TagModule,
        ButtonModule,
        //
        DiffSectionGroupComponent,
        DiffSectionReferanceComponent,
    ]
})
export class DiffTableComponent {
  table$ = this.diffComparator.diffResult;
  configTypes = ConfigTypes;

  constructor(private diffComparator: DiffComparatorService) {}
}
