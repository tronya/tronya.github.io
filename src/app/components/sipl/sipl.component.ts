import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SiplDiagramComponent } from './sipl-diagram/sipl-diagram.component';

import { labelsMock } from './mock/labels.mock';
import { siplMock } from './mock/sipl.mock';

@Component({
  selector: 'app-sipl',
  standalone: true,
  imports: [CommonModule, SiplDiagramComponent],
  templateUrl: './sipl.component.html',
})
export class SiplComponent {
  public data = siplMock;
  public labels = labelsMock;
}
