import { inject, Injectable } from '@angular/core';
import { SiplDiagramLabel } from '../model/label';
import { BehaviorSubject } from 'rxjs';
import { SnapshotService } from './snaphot.service';
import { DiagramUiService } from './diagram-ui.service';

@Injectable()
export class SiplEngineService {
  snapshots = this.snapshotService.getSnapshots();
  constructor(
    private snapshotService: SnapshotService,
    private diagramUiService: DiagramUiService
  ) {
    this.snapshotService.getSnapShotsCount().subscribe((count) => {
      console.log('Snapshots: count', count);
      this.diagramUiService.setWidth(count);
    });
    this.labels$.subscribe((labels) => {
      console.log('Labels: count', labels);
      this.diagramUiService.setHeight(labels.length);
    });
  }
  labels$: BehaviorSubject<SiplDiagramLabel[]> = new BehaviorSubject<
    SiplDiagramLabel[]
  >([]);
  public setLabels(labels: SiplDiagramLabel[]): void {
    this.labels$.next(labels);
  }
  public getLabels(): SiplDiagramLabel[] {
    return this.labels$.getValue();
  }
}
