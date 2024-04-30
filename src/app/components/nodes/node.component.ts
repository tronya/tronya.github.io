import { Component, computed, input } from '@angular/core';
import { NodeZ } from './nodes.component';

@Component({
  standalone: true,
  selector: 'node',
  template: '<div>@if(id()){<p>{{id()}}</p>}</div>',
})
export class NodeComponent {
  node = input<NodeZ>();
  id = computed(() => this.node()?.id);
}
