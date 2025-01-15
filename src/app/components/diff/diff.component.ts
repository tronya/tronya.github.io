import { Component } from '@angular/core';
import { DiffStoreService } from './service/diff-store.service';

import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { linksMock } from './mocks/links';
import { nodesMock } from './mocks/nodes';
import {
  trafficNetwork,
  trafficNetwork2,
  trafficNetwork3,
} from './mocks/traffic-network';
import { DiffModelsTypes } from './service/dto';
import { DiffTypes } from './service/models';
import { DiffBarComponent } from './ui/diff-bar/diff-bar.component';
import { DiffTableComponent } from './ui/diff-table/diff-table.component';

@Component({
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
    providers: [DiffStoreService, MessageService]
})
export class DiffComponent {
  tn1 = trafficNetwork;
  tn2 = trafficNetwork2;
  tn3 = trafficNetwork3;

  node1 = nodesMock[1];
  node2 = nodesMock[34];
  node3 = nodesMock[45];

  links1 = linksMock[0];
  links2 = linksMock[1];

  types = DiffTypes;

  constructor(private diffStoreService: DiffStoreService) {
    this.addDiffItem(this.tn1, DiffTypes.TrafficNetwork);
    this.addDiffItem(this.tn2, DiffTypes.TrafficNetwork);
  }

  addDiffItem(item: DiffModelsTypes, type: DiffTypes) {
    this.diffStoreService.addDiffItem(item, type);
  }
  clear() {
    this.diffStoreService.clear();
  }
}
