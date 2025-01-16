import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NodeComponent } from './node.component';

export interface NodeZ {
  id: string;
  children: NodeZ[];
}

@Component({
  imports: [CommonModule],
  template: '<div><p>Hello</p></div>',
  selector: 'nodes',
})
export class NodesComponent {
  nodes: NodeZ[] = [
    {
      id: '1',
      children: [
        {
          id: '2',
          children: [{ id: '3', children: [{ id: '4', children: [] }] }],
        },
      ],
    },
  ];
}
