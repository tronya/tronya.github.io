import { Component } from '@angular/core';
import { DiffStoreService } from './service/diff-store.service';
import { DiffModelsTypes, DiffTypes, TrafficNetwork } from './service/models';

import {
  trafficNetwork,
  trafficNetwork2,
  trafficNetwork3,
} from './mocks/traffic-network';
import { DiffBarComponent } from './ui/diff-bar/diff-bar.component';
import { DiffTableComponent } from './ui/diff-table/diff-table.component';
import { ButtonModule } from 'primeng/button';
import { nodesMock } from './mocks/nodes';
import { MessageService } from 'primeng/api';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'diff',
  templateUrl: './diff.component.html',
  imports: [
    CommonModule,
    DiffBarComponent,
    DiffTableComponent,
    ButtonModule,
    ToastModule,
    RippleModule,
  ],
  providers: [DiffStoreService, MessageService],
})
export class DiffComponent {
  tn1 = trafficNetwork;
  tn2 = trafficNetwork2;
  tn3 = trafficNetwork3;

  node1 = nodesMock[1];
  node2 = nodesMock[34];
  node3 = nodesMock[45];

  types = DiffTypes;

  constructor(private diffStoreService: DiffStoreService) {
    this.addDiffItem(this.tn1, DiffTypes.TrafficNetwork);
  }

  addDiffItem(item: DiffModelsTypes, type: DiffTypes) {
    this.diffStoreService.addDiffItem(item, type);
  }
}
